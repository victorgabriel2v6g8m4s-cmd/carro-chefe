from __future__ import annotations

from pathlib import Path

from .operations import OperationRunner as V3AOperationRunner
from .structural_v3b import V3BStructuralEngine, V3BStructuralPlanner
from .workbook import WorkbookContext


class OperationRunner(V3AOperationRunner):
    """Runner compatível com V1/V2/V3A, promovendo apenas o subsistema estrutural para V3B."""

    def __init__(self, workbook: WorkbookContext, repo_root: Path | None = None) -> None:
        super().__init__(workbook, repo_root=repo_root)
        root = repo_root or Path.cwd()
        self.structural_planner = V3BStructuralPlanner(workbook, root)
        self.structural = V3BStructuralEngine(workbook, self.structural_planner)
