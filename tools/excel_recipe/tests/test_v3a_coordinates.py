from __future__ import annotations

import unittest

from tools.excel_recipe.coordinates import AxisTransform, RangeMoveTransform
from tools.excel_recipe.errors import RecipeError


class CoordinateTransformTests(unittest.TestCase):
    def test_insert_rows_shifts_and_expands_ranges(self) -> None:
        transform = AxisTransform("Dados", "row", "insert", 5, 2)
        self.assertEqual("A7", transform.transform_cell_ref("A5"))
        self.assertEqual("B2:C12", transform.transform_range("B2:C10").ref)
        self.assertEqual("expanded", transform.transform_range("B2:C10").relation)
        self.assertEqual("B12:C14", transform.transform_range("B10:C12").ref)

    def test_delete_rows_classifies_partial_and_removed(self) -> None:
        transform = AxisTransform("Dados", "row", "delete", 5, 2)
        self.assertIsNone(transform.transform_cell_ref("C5"))
        self.assertEqual("A2:A8", transform.transform_range("A2:A10").ref)
        self.assertEqual("contracted", transform.transform_range("A2:A10").relation)
        self.assertEqual("partial", transform.transform_range("A5:A9").relation)
        self.assertIsNone(transform.transform_range("A5:A6").ref)

    def test_insert_and_delete_columns(self) -> None:
        insert = AxisTransform("Dados", "column", "insert", 2, 1)
        self.assertEqual("C4", insert.transform_cell_ref("B4"))
        self.assertEqual("A1:D5", insert.transform_range("A1:C5").ref)
        delete = AxisTransform("Dados", "column", "delete", 2, 1)
        self.assertIsNone(delete.transform_cell_ref("B4"))
        self.assertEqual("B4", delete.transform_cell_ref("C4"))

    def test_range_move_requires_non_overlapping_target(self) -> None:
        transform = RangeMoveTransform("Dados", "B2:C3", "E5")
        self.assertEqual("E5:F6", transform.destination_range)
        self.assertEqual("E5", transform.transform_cell_ref("B2"))
        self.assertEqual("E5:F6", transform.transform_range("B2:C3").ref)
        self.assertEqual("partial", transform.transform_range("A2:B2").relation)
        with self.assertRaises(RecipeError):
            RangeMoveTransform("Dados", "B2:C3", "C3")

    def test_excel_limits_are_enforced(self) -> None:
        transform = AxisTransform("Dados", "row", "insert", 1_048_576, 1)
        with self.assertRaises(RecipeError):
            transform.transform_cell_ref("A1048576")
        with self.assertRaises(RecipeError):
            AxisTransform("Dados", "column", "delete", 16384, 2)


if __name__ == "__main__":
    unittest.main()
