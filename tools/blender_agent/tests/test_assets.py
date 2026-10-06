from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from tools.blender_agent import assets, protocol


ROOT = Path(__file__).resolve().parents[1]
MCP = ROOT / "mcp_server_v05.py"
CLI = ROOT / "image_cli.py"


class AssetActionTests(unittest.TestCase):
    def test_resolve_asset_accepts_opt_in_asset_root(self) -> None:
        previous = os.environ.get("CC_BLENDER_ASSET_ROOT")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "assets"
            root.mkdir()
            image = root / "reference.png"
            image.write_bytes(b"not-a-real-png-needed-for-path-validation")
            os.environ["CC_BLENDER_ASSET_ROOT"] = str(root)
            try:
                self.assertEqual(assets.resolve_asset_path(image), image.resolve())
            finally:
                if previous is None:
                    os.environ.pop("CC_BLENDER_ASSET_ROOT", None)
                else:
                    os.environ["CC_BLENDER_ASSET_ROOT"] = previous

    def test_resolve_asset_rejects_unsupported_extension(self) -> None:
        previous = os.environ.get("CC_BLENDER_ASSET_ROOT")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            file = root / "payload.txt"
            file.write_text("x", encoding="utf-8")
            os.environ["CC_BLENDER_ASSET_ROOT"] = str(root)
            try:
                with self.assertRaises(ValueError):
                    assets.resolve_asset_path(file)
            finally:
                if previous is None:
                    os.environ.pop("CC_BLENDER_ASSET_ROOT", None)
                else:
                    os.environ["CC_BLENDER_ASSET_ROOT"] = previous

    def test_resolve_asset_rejects_path_outside_allowed_roots(self) -> None:
        previous = os.environ.get("CC_BLENDER_ASSET_ROOT")
        with tempfile.TemporaryDirectory() as allowed_tmp, tempfile.TemporaryDirectory() as other_tmp:
            allowed = Path(allowed_tmp)
            other = Path(other_tmp) / "outside.png"
            other.write_bytes(b"x")
            os.environ["CC_BLENDER_ASSET_ROOT"] = str(allowed)
            try:
                with self.assertRaises(protocol.SecurityError):
                    assets.resolve_asset_path(other)
            finally:
                if previous is None:
                    os.environ.pop("CC_BLENDER_ASSET_ROOT", None)
                else:
                    os.environ["CC_BLENDER_ASSET_ROOT"] = previous

    def test_asset_runtime_exposes_two_semantic_actions(self) -> None:
        source = (ROOT / "assets.py").read_text(encoding="utf-8")
        self.assertIn('"reference.image.add"', source)
        self.assertIn('"material.image_texture"', source)
        self.assertIn("ShaderNodeTexImage", source)
        self.assertIn('principled.inputs.get("Base Color")', source)
        self.assertIn('empty_display_type = "IMAGE"', source)

    def test_mcp_and_typed_cli_expose_asset_actions(self) -> None:
        mcp_source = MCP.read_text(encoding="utf-8")
        cli_source = CLI.read_text(encoding="utf-8")
        self.assertIn("def blender_reference_image_add", mcp_source)
        self.assertIn("def blender_material_image_texture", mcp_source)
        self.assertIn('sub.add_parser("reference-add"', cli_source)
        self.assertIn('sub.add_parser("material-texture"', cli_source)


if __name__ == "__main__":
    unittest.main()
