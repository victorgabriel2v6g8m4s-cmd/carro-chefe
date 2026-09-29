from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from tools.blender_agent.protocol import (
    ProtocolError,
    decode_message,
    encode_message,
    normalize_request,
    safe_runtime_path,
    sanitize_label,
)


class ProtocolTests(unittest.TestCase):
    def test_normalizes_allowlisted_request(self) -> None:
        request = normalize_request({
            "version": 1,
            "id": "test-1",
            "action": "ui.drag",
            "params": {"x1": 1, "y1": 2, "x2": 3, "y2": 4},
        })
        self.assertEqual(request["action"], "ui.drag")
        self.assertEqual(request["params"]["x2"], 3)

    def test_viewport_actions_are_allowlisted(self) -> None:
        for action in (
            "ui.dismiss_modal",
            "ui.view3d",
            "ui.orbit",
            "viewport.describe",
            "viewport.set_view",
            "viewport.frame_all",
            "viewport.set_shading",
            "viewport.capture",
            "workspace.list",
            "workspace.describe",
            "workspace.capture_set",
            "history.stage.create",
            "history.stage.list",
            "history.stage.activate",
            "history.stage.describe",
            "history.search",
            "history.note",
            "sculpt.status",
            "sculpt.prepare",
            "sculpt.stroke",
        ):
            request = normalize_request({
                "version": 1,
                "id": f"test-{action}",
                "action": action,
                "params": {},
            })
            self.assertEqual(request["action"], action)

    def test_rejects_arbitrary_action(self) -> None:
        with self.assertRaises(ProtocolError):
            normalize_request({
                "version": 1,
                "id": "bad-1",
                "action": "python.exec",
                "params": {"code": "print('no')"},
            })

    def test_round_trip_message(self) -> None:
        original = {
            "version": 1,
            "id": "roundtrip",
            "action": "health",
            "params": {},
        }
        encoded = encode_message(original)
        decoded = decode_message(encoded.rstrip(b"\n"))
        self.assertEqual(decoded["id"], "roundtrip")
        self.assertEqual(decoded["action"], "health")

    def test_runtime_path_is_sandboxed(self) -> None:
        previous = os.environ.get("CC_BLENDER_RUNTIME")
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["CC_BLENDER_RUNTIME"] = tmp
            try:
                result = safe_runtime_path("renders", "../outside.png")
                self.assertEqual(result.parent, Path(tmp).resolve() / "renders")
                self.assertNotIn("..", result.name)
            finally:
                if previous is None:
                    os.environ.pop("CC_BLENDER_RUNTIME", None)
                else:
                    os.environ["CC_BLENDER_RUNTIME"] = previous

    def test_sanitize_label_removes_path_punctuation(self) -> None:
        self.assertEqual(sanitize_label("../../baguete final.png"), "baguete-final.png")


if __name__ == "__main__":
    unittest.main()
