from __future__ import annotations

import unittest

from tools.blender_agent.client import build_parser


class ClientParserTests(unittest.TestCase):
    def test_ui_drag_parses_modifiers(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "ui-drag",
            "10",
            "20",
            "100",
            "120",
            "--button",
            "middle",
            "--shift",
            "--steps",
            "12",
        ])
        self.assertEqual(args.command, "ui-drag")
        self.assertEqual(args.button, "middle")
        self.assertTrue(args.shift)
        self.assertEqual(args.steps, 12)

    def test_generic_call_accepts_json(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "call",
            "object.transform",
            "--json",
            '{"name":"Pao","scale":[2,1,1]}',
        ])
        self.assertEqual(args.action, "object.transform")
        self.assertEqual(args.params["name"], "Pao")


if __name__ == "__main__":
    unittest.main()
