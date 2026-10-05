from __future__ import annotations

import unittest

from tools.blender_agent.iteration_cli import build_parser


class IterationCliTests(unittest.TestCase):
    def test_validate_parser(self) -> None:
        args = build_parser().parse_args(["validate", "config.json"])
        self.assertEqual(args.command, "validate")
        self.assertEqual(args.config, "config.json")

    def test_start_parser(self) -> None:
        args = build_parser().parse_args([
            "start", "config.json",
            "--source-recipe-id", "baguette",
            "--source-recipe-version", "1.0.0",
        ])
        self.assertEqual(args.command, "start")
        self.assertEqual(args.source_recipe_id, "baguette")

    def test_apply_requires_explicit_flag_value_only_when_requested(self) -> None:
        parser = build_parser()
        pending = parser.parse_args(["apply"])
        approved = parser.parse_args(["apply", "--approve"])
        self.assertFalse(pending.approve)
        self.assertTrue(approved.approve)

    def test_evaluate_parser(self) -> None:
        args = build_parser().parse_args([
            "evaluate", "rollback",
            "--visual-score", "0.91",
            "--visual-reviewed",
            "--view-score", "front=0.9",
            "--view-score", "three-quarter=0.92",
        ])
        self.assertEqual(args.decision, "rollback")
        self.assertAlmostEqual(args.visual_score, 0.91)
        self.assertTrue(args.visual_reviewed)
        self.assertEqual(args.view_score, ["front=0.9", "three-quarter=0.92"])


if __name__ == "__main__":
    unittest.main()
