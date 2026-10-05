from __future__ import annotations

import copy
import unittest

from tools.blender_agent.iteration import (
    IterationError,
    evaluate_criteria,
    metrics_diff,
    validate_iteration_config,
    validate_proposal,
)


class IterationEngineTests(unittest.TestCase):
    def _config(self) -> dict:
        return {
            "schema_version": 1,
            "label": "baguette-review",
            "target_objects": ["Bread"],
            "max_iterations": 4,
            "views": [
                {
                    "name": "front",
                    "preset": "FRONT",
                    "shading": "MATERIAL",
                    "target_object": "Bread",
                },
                {
                    "name": "three-quarter",
                    "preset": "THREE_QUARTER",
                    "shading": "MATERIAL",
                    "target_object": "Bread",
                },
            ],
            "criteria": {
                "dimension_ranges": {
                    "Bread": {"x": [5.0, 9.0], "y": [1.0, 4.0], "z": [0.5, 3.0]}
                },
                "vertex_ranges": {"Bread": [8, 10000]},
                "min_visual_score": 0.8,
                "require_visual_review": True,
                "max_failed_actions": 0,
                "max_rollbacks": 2,
            },
            "require_human_approval": True,
            "create_stage": True,
            "restore_stage": True,
            "restore_workspace": True,
            "tags": ["v0.5", "test"],
        }

    def test_config_validates_without_mutating_input(self) -> None:
        config = self._config()
        before = copy.deepcopy(config)
        result = validate_iteration_config(config)
        self.assertTrue(result["ok"])
        self.assertEqual(config, before)
        self.assertEqual(result["config"]["max_iterations"], 4)
        self.assertEqual(len(result["config"]["views"]), 2)
        self.assertEqual(len(result["config_hash"]), 64)

    def test_config_rejects_unknown_fields_and_excess_budget(self) -> None:
        config = self._config()
        config["python"] = "print('no')"
        with self.assertRaisesRegex(IterationError, "campos desconhecidos"):
            validate_iteration_config(config)

        config = self._config()
        config["max_iterations"] = 21
        with self.assertRaisesRegex(IterationError, "max_iterations"):
            validate_iteration_config(config)

    def test_proposal_is_allowlisted_and_target_scoped(self) -> None:
        result = validate_proposal({
            "action": "object.transform",
            "params": {"name": "Bread", "location": [0.1, 0.0, 0.0]},
            "rationale": "centralizar",
            "expected_effect": "pequeno deslocamento",
            "confidence": 0.9,
            "tags": ["shape"],
        }, targets=["Bread"])
        self.assertEqual(result["proposal"]["action"], "object.transform")
        self.assertFalse(result["proposal"]["destructive"])
        self.assertEqual(len(result["proposal_hash"]), 64)

        with self.assertRaisesRegex(IterationError, "fora dos targets"):
            validate_proposal({
                "action": "object.transform",
                "params": {"name": "Camera", "location": [0, 0, 0]},
            }, targets=["Bread"])

        with self.assertRaisesRegex(IterationError, "nao permitida"):
            validate_proposal({
                "action": "object.delete",
                "params": {"name": "Bread"},
            }, targets=["Bread"])

    def test_destructive_proposal_is_marked(self) -> None:
        result = validate_proposal({
            "action": "object.irregularize",
            "params": {"name": "Bread", "seed": 7, "amplitude": [0.01, 0.01, 0.01]},
        }, targets=["Bread"])
        self.assertTrue(result["proposal"]["destructive"])

    def test_metrics_diff_tracks_transform_and_geometry_change(self) -> None:
        before = {
            "Bread": {
                "location": [0.0, 0.0, 0.0],
                "rotation_euler": [0.0, 0.0, 0.0],
                "scale": [1.0, 1.0, 1.0],
                "dimensions": [6.0, 2.0, 1.0],
                "vertex_count": 8,
                "edge_count": 12,
                "polygon_count": 6,
                "modifier_count": 2,
                "material_count": 1,
                "geometry_hash": "a",
                "state_hash": "a1",
            }
        }
        after = copy.deepcopy(before)
        after["Bread"]["location"] = [0.25, 0.0, 0.0]
        after["Bread"]["geometry_hash"] = "b"
        after["Bread"]["state_hash"] = "b1"
        diff = metrics_diff(before, after)["Bread"]
        self.assertEqual(diff["location_delta"], [0.25, 0.0, 0.0])
        self.assertTrue(diff["geometry_changed"])
        self.assertTrue(diff["state_hash_changed"])

    def test_criteria_require_structural_and_visual_acceptance(self) -> None:
        criteria = validate_iteration_config(self._config())["config"]["criteria"]
        metrics = {
            "Bread": {
                "dimensions": [6.5, 2.0, 1.0],
                "vertex_count": 128,
            }
        }
        pending = evaluate_criteria(
            criteria,
            metrics,
            visual_score=None,
            visual_reviewed=False,
            failed_actions=0,
            rollbacks=0,
            iteration_count=1,
            max_iterations=4,
        )
        self.assertFalse(pending["passed"])
        self.assertFalse(pending["checks"]["visual"]["passed"])

        accepted = evaluate_criteria(
            criteria,
            metrics,
            visual_score=0.9,
            visual_reviewed=True,
            failed_actions=0,
            rollbacks=1,
            iteration_count=2,
            max_iterations=4,
        )
        self.assertTrue(accepted["passed"])


if __name__ == "__main__":
    unittest.main()
