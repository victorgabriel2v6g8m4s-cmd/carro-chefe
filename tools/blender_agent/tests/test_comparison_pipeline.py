from __future__ import annotations

import contextlib
import io
import json
import os
import tempfile
import unittest
from pathlib import Path

from tools.blender_agent import protocol
from tools.blender_agent.compare_cli import main as compare_main
from tools.blender_agent.comparison import ComparisonError, compose
from tools.blender_agent.comparison_render import require_pillow


class ComparisonPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.runtime = self.root / "runtime"
        self.assets = self.root / "assets"
        self.assets.mkdir(parents=True)
        self.previous_runtime = os.environ.get("CC_BLENDER_RUNTIME")
        self.previous_asset_root = os.environ.get("CC_BLENDER_ASSET_ROOT")
        os.environ["CC_BLENDER_RUNTIME"] = str(self.runtime)
        os.environ["CC_BLENDER_ASSET_ROOT"] = str(self.assets)
        Image, *_ = require_pillow()
        self.reference = self.assets / "reference.png"
        Image.new("RGBA", (120, 160), (245, 245, 245, 255)).save(self.reference)
        self.recipe = self.assets / "fixture.json"
        self.recipe.write_text(json.dumps({
            "schema_version": 1,
            "id": "compare-fixture",
            "version": "1.0.0",
            "label": "Compare fixture",
            "description": "",
            "tags": ["test"],
            "parameters": {},
            "components": [{
                "id": "mesh",
                "label": "Mesh",
                "object_name": "FixtureMesh",
                "kind": "mesh",
                "tags": [],
            }],
            "steps": [{
                "id": "create",
                "label": "Create",
                "action": "object.add_mesh",
                "params": {
                    "name": "FixtureMesh",
                    "vertices": [
                        [-1.0, 0.0, -2.0],
                        [1.0, 0.0, -2.0],
                        [1.0, 0.0, 2.0],
                        [-1.0, 0.0, 2.0],
                    ],
                    "faces": [[0, 1, 2, 3]],
                },
                "checkpoint_before": False,
                "checkpoint_label": "create",
                "capture_after": None,
                "continue_on_error": False,
                "tags": ["geometry"],
            }],
            "validation_views": [],
            "criteria": {"required_objects": ["FixtureMesh"], "min_captures": 0, "max_failed_steps": 0},
            "variants": {},
        }), encoding="utf-8")

    def tearDown(self) -> None:
        if self.previous_runtime is None:
            os.environ.pop("CC_BLENDER_RUNTIME", None)
        else:
            os.environ["CC_BLENDER_RUNTIME"] = self.previous_runtime
        if self.previous_asset_root is None:
            os.environ.pop("CC_BLENDER_ASSET_ROOT", None)
        else:
            os.environ["CC_BLENDER_ASSET_ROOT"] = self.previous_asset_root
        self.temp.cleanup()

    def _options(self) -> dict:
        output = self.runtime / "exports" / "comparison.png"
        return {
            "reference": str(self.reference),
            "source": "recipe",
            "recipe": str(self.recipe),
            "object": "FixtureMesh",
            "view": "FRONT",
            "align": "manual",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "rotate": 0.0,
            "fill": True,
            "opacity": 50.0,
            "lines": True,
            "line_mode": "all",
            "border": True,
            "output": str(output),
            "force": True,
            "no_history": True,
        }

    def test_recipe_compose_writes_png_and_receipt(self) -> None:
        result = compose(self._options())
        output = Path(result["output"]["path"])
        receipt = Path(result["receipt"])
        self.assertTrue(output.exists())
        self.assertTrue(receipt.exists())
        data = json.loads(receipt.read_text(encoding="utf-8"))
        self.assertEqual(data["source"]["type"], "recipe")
        self.assertEqual(data["mesh"]["counts"]["vertices"], 4)
        self.assertEqual(data["render"]["opacity"], 50.0)
        self.assertTrue(data["render"]["lines"])
        self.assertTrue(data["render"]["border"])
        self.assertEqual(len(data["output"]["sha256"]), 64)
        self.assertEqual(data["kind"], "visual-comparison-not-metrology")

    def test_manual_alignment_can_correct_introduced_offset(self) -> None:
        options = self._options()
        options["offset_x"] = 12.0
        options["offset_y"] = -7.0
        options["rotate"] = 0.4
        result = compose(options)
        alignment = result["alignment"]
        self.assertAlmostEqual(alignment["offset_x"], 12.0)
        self.assertAlmostEqual(alignment["offset_y"], -7.0)
        self.assertAlmostEqual(alignment["rotate_deg"], 0.4)

    def test_strict_auto_rejects_inconclusive_uniform_reference(self) -> None:
        options = self._options()
        options["align"] = "auto"
        options["strict_alignment"] = True
        with self.assertRaises(ComparisonError):
            compose(options)
        self.assertFalse(Path(options["output"]).exists())

    def test_dry_run_does_not_write_png(self) -> None:
        options = self._options()
        options["dry_run"] = True
        result = compose(options)
        self.assertTrue(result["dry_run"])
        self.assertFalse(Path(options["output"]).exists())

    def test_cli_json_has_zero_exit_on_valid_dry_run(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = compare_main([
                "compose",
                "--reference", str(self.reference),
                "--source", "recipe",
                "--recipe", str(self.recipe),
                "--object", "FixtureMesh",
                "--view", "FRONT",
                "--align", "manual",
                "--dry-run",
                "--json",
                "--no-history",
            ])
        self.assertEqual(code, 0)
        payload = json.loads(output.getvalue())
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["dry_run"])

    def test_output_cannot_escape_runtime_exports(self) -> None:
        options = self._options()
        options["output"] = str(self.assets / "forbidden.png")
        with self.assertRaises(protocol.SecurityError):
            compose(options)


if __name__ == "__main__":
    unittest.main()
