from __future__ import annotations

import copy
import unittest

from tools.blender_agent.materials import (
    MaterialLibraryError,
    load_material_library,
    material_preset,
    validate_material_library,
)


class MaterialLibraryTests(unittest.TestCase):
    def test_built_in_library_validates(self) -> None:
        library = load_material_library()
        self.assertEqual(library["id"], "carro-chefe-food-materials")
        self.assertEqual(library["version"], "1.0.0")
        for preset in (
            "bread-crust",
            "bread-crumb",
            "meat-grilled",
            "cheese-melted",
            "vinaigrette",
            "sauce-creamy",
            "skewer-wood",
        ):
            self.assertIn(preset, library["materials"])

    def test_preset_overrides_do_not_mutate_library(self) -> None:
        before = load_material_library()
        preset = material_preset("bread-crust", overrides={"roughness": 0.41})
        after = load_material_library()
        self.assertEqual(before, after)
        self.assertEqual(preset["roughness"], 0.41)
        self.assertEqual(preset["preset_id"], "bread-crust")

    def test_unknown_preset_fails(self) -> None:
        with self.assertRaisesRegex(MaterialLibraryError, "preset inexistente"):
            material_preset("missing")

    def test_unknown_preset_field_is_rejected(self) -> None:
        library = load_material_library()
        broken = copy.deepcopy(library)
        broken["materials"]["bread-crust"]["python"] = "no"
        with self.assertRaisesRegex(MaterialLibraryError, "campos desconhecidos"):
            validate_material_library(broken)


if __name__ == "__main__":
    unittest.main()
