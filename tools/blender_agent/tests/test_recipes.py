from __future__ import annotations

import copy
import unittest
from pathlib import Path

from tools.blender_agent.recipes import (
    RecipeError,
    load_recipe,
    plan_recipe,
    validate_recipe,
)


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "recipes" / "carro-chefe-baguette-base-v1.json"


class RecipeEngineTests(unittest.TestCase):
    def test_example_recipe_validates(self) -> None:
        result = validate_recipe(load_recipe(EXAMPLE))
        self.assertTrue(result["ok"])
        self.assertEqual(result["summary"]["id"], "carro-chefe-baguette-base")
        self.assertEqual(result["summary"]["version"], "1.0.0")
        self.assertEqual(result["summary"]["steps"], 5)
        self.assertEqual(result["summary"]["validation_views"], 4)
        self.assertEqual(len(result["recipe_hash"]), 64)

    def test_variant_and_override_resolve_without_mutating_recipe(self) -> None:
        recipe = load_recipe(EXAMPLE)
        before = copy.deepcopy(recipe)
        result = plan_recipe(
            recipe,
            variant="long",
            overrides={"roughness": 0.42, "object_name": "Recipe_Test"},
        )
        self.assertEqual(recipe, before)
        plan = result["plan"]
        self.assertEqual(plan["parameters"]["bread_scale"], [4.5, 1.05, 0.65])
        self.assertEqual(plan["parameters"]["roughness"], 0.42)
        self.assertEqual(plan["components"][0]["object_name"], "Recipe_Test")
        self.assertEqual(plan["criteria"]["required_objects"], ["Recipe_Test"])
        self.assertEqual(plan["steps"][0]["params"]["scale"], [4.5, 1.05, 0.65])
        self.assertEqual(plan["steps"][0]["params"]["name"], "Recipe_Test")
        self.assertEqual(len(plan["plan_hash"]), 64)

    def test_unknown_top_level_field_is_rejected(self) -> None:
        recipe = load_recipe(EXAMPLE)
        recipe["python"] = "print('no')"
        with self.assertRaisesRegex(RecipeError, "campos desconhecidos"):
            validate_recipe(recipe)

    def test_unsafe_action_is_rejected(self) -> None:
        recipe = load_recipe(EXAMPLE)
        recipe["steps"][0]["action"] = "ui.click"
        with self.assertRaisesRegex(RecipeError, "action nao permitida"):
            validate_recipe(recipe)

    def test_unknown_parameter_override_is_rejected(self) -> None:
        with self.assertRaisesRegex(RecipeError, "overrides desconhecidos"):
            plan_recipe(load_recipe(EXAMPLE), overrides={"missing": 1})

    def test_parameter_bounds_are_enforced(self) -> None:
        with self.assertRaisesRegex(RecipeError, "acima do maximo"):
            plan_recipe(load_recipe(EXAMPLE), overrides={"roughness": 2.0})

    def test_unknown_variant_is_rejected(self) -> None:
        with self.assertRaisesRegex(RecipeError, "variant inexistente"):
            plan_recipe(load_recipe(EXAMPLE), variant="missing")

    def test_hash_is_deterministic(self) -> None:
        first = validate_recipe(load_recipe(EXAMPLE))["recipe_hash"]
        second = validate_recipe(load_recipe(EXAMPLE))["recipe_hash"]
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
