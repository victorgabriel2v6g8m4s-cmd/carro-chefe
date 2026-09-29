from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from tools.blender_agent import history


class HistoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.previous_runtime = os.environ.get("CC_BLENDER_RUNTIME")
        os.environ["CC_BLENDER_RUNTIME"] = self.tmp.name

    def tearDown(self) -> None:
        if self.previous_runtime is None:
            os.environ.pop("CC_BLENDER_RUNTIME", None)
        else:
            os.environ["CC_BLENDER_RUNTIME"] = self.previous_runtime
        self.tmp.cleanup()

    def test_stage_chain_and_navigation(self) -> None:
        first = history.create_stage("Base mesh", stage_id="base-mesh")
        second = history.create_stage("Bread shape", stage_id="bread-shape")

        self.assertEqual(first["previous_stage_id"], None)
        self.assertEqual(second["previous_stage_id"], "base-mesh")
        self.assertEqual(history.get_active_stage_id(), "bread-shape")

        context = history.describe_stage("base-mesh", recent=5)
        self.assertIn("bread-shape", context["next_stage_ids"])
        self.assertEqual(history.get_stage_metadata("base-mesh")["status"], "completed")
        self.assertEqual(history.get_stage_metadata("bread-shape")["status"], "active")

    def test_record_search_redaction_and_filters(self) -> None:
        history.create_stage("Model", stage_id="model")
        history.record_event(
            action="object.transform",
            params={"name": "Baguete", "token": "do-not-store", "scale": [2, 1, 1]},
            result={"changed": True},
            ok=True,
            tags=["bread", "shape"],
        )
        history.record_event(
            action="object.delete",
            params={"name": "Temp"},
            error="not found",
            ok=False,
            tags=["cleanup"],
        )

        result = history.search_events(query="Baguete", stage_id="model")
        self.assertEqual(len(result["matches"]), 1)
        event = result["matches"][0]
        self.assertEqual(event["params"]["token"], "<redacted>")

        failed = history.search_events(stage_id="model", success=False)
        self.assertEqual(len(failed["matches"]), 1)
        self.assertEqual(failed["matches"][0]["action"], "object.delete")

        tagged = history.search_events(stage_id="model", tags=["bread"])
        self.assertEqual(len(tagged["matches"]), 1)

    def test_multi_keyword_search(self) -> None:
        history.create_stage("Search", stage_id="search")
        history.record_event(
            action="modifier.add",
            params={"name": "Baguete", "type": "BEVEL"},
            result={"segments": 6},
            ok=True,
        )
        result = history.search_events(query="baguete bevel", stage_id="search")
        self.assertEqual(len(result["matches"]), 1)

    def test_attachment_is_hashed_and_referenced(self) -> None:
        history.create_stage("Capture", stage_id="capture")
        attachment = history.attachment_output_path("front.png")
        attachment.write_bytes(b"fake-png-content")

        event = history.record_event(
            action="viewport.capture",
            params={"filename": "front.png"},
            result={"path": str(attachment)},
            ok=True,
        )
        self.assertEqual(len(event["attachments"]), 1)
        self.assertEqual(event["attachments"][0]["path"], str(attachment.resolve()))
        self.assertEqual(len(event["attachments"][0]["sha256"]), 64)

        result = history.search_events(stage_id="capture", has_attachment=True)
        self.assertEqual(len(result["matches"]), 1)

    def test_events_are_segmented_and_old_segments_can_be_pruned(self) -> None:
        old_events = history.SEGMENT_MAX_EVENTS
        old_segments = history.MAX_SEGMENTS_PER_STAGE
        try:
            history.SEGMENT_MAX_EVENTS = 1
            history.MAX_SEGMENTS_PER_STAGE = 2
            history.create_stage("Segmented", stage_id="segmented")
            for index in range(4):
                history.record_event(
                    action="test.action",
                    params={"index": index},
                    result={"ok": index},
                    ok=True,
                )

            event_dir = Path(self.tmp.name) / "history" / "segmented" / "events"
            segments = sorted(event_dir.glob("events-*.jsonl"))
            self.assertLessEqual(len(segments), 2)
            metadata = history.get_stage_metadata("segmented")
            self.assertGreaterEqual(metadata["history"]["pruned_segments"], 1)
        finally:
            history.SEGMENT_MAX_EVENTS = old_events
            history.MAX_SEGMENTS_PER_STAGE = old_segments

    def test_activate_existing_stage_updates_status(self) -> None:
        history.create_stage("One", stage_id="one")
        history.create_stage("Two", stage_id="two")
        history.set_active_stage("one")
        self.assertEqual(history.get_stage_metadata("one")["status"], "active")
        self.assertEqual(history.get_stage_metadata("two")["status"], "completed")


if __name__ == "__main__":
    unittest.main()
