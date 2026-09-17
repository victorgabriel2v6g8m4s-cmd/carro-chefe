from __future__ import annotations

from pathlib import Path

from .operations import OperationRunner
from .structural_v3b import StructuralEngineV3B, StructuralPlannerV3B
from .workbook import WorkbookContext


class OperationRunnerV3B(OperationRunner):
    """Runner corrente do Excel Recipe com extensão visual V3B."""

    def __init__(self, workbook: WorkbookContext, repo_root: Path | None = None) -> None:
        super().__init__(workbook, repo_root=repo_root)
        root = repo_root or Path.cwd()
        self.structural_planner = StructuralPlannerV3B(workbook, root)
        self.structural = StructuralEngineV3B(workbook, self.structural_planner)
