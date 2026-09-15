from __future__ import annotations

import unittest

from tools.excel_recipe.a1_refs import rewrite_formula_a1
from tools.excel_recipe.coordinates import AxisTransform


class FormulaReferenceV3ATests(unittest.TestCase):
    def setUp(self) -> None:
        self.transform = AxisTransform("Dados", "column", "insert", 2, 1)

    def test_whole_column_reference_on_target_sheet_is_blocked(self) -> None:
        _, _, blockers = rewrite_formula_a1("SUM(Dados!A:A)", "Resumo", self.transform)
        self.assertTrue(any("linha/coluna inteira" in blocker for blocker in blockers))

    def test_whole_row_reference_in_target_context_is_blocked(self) -> None:
        _, _, blockers = rewrite_formula_a1("SUM(1:1)", "Dados", self.transform)
        self.assertTrue(any("linha/coluna inteira" in blocker for blocker in blockers))

    def test_whole_column_reference_on_other_sheet_is_not_blocked(self) -> None:
        _, _, blockers = rewrite_formula_a1("SUM(A:A)", "Resumo", self.transform)
        self.assertEqual([], blockers)

    def test_string_literal_that_looks_like_axis_reference_is_ignored(self) -> None:
        _, _, blockers = rewrite_formula_a1('IF(A1="A:A",1,0)', "Dados", self.transform)
        self.assertFalse(any("linha/coluna inteira" in blocker for blocker in blockers))


if __name__ == "__main__":
    unittest.main()
