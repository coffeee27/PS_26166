"""PROVE score: how many measured checks a registration passes.

Not a made-up quality percentage. Each check compares one number the engine
already measured against a fixed limit, and the report shows both. The limits
were set by our team and are meant to be tuned on more image pairs.
"""

from __future__ import annotations

SUBPIXEL_MAX_PX = 1.0  # hold-out RMSE on unseen blocks
MATCH_AGREEMENT_MIN = 0.5  # share of rough matches that MAGSAC++ kept
COVERAGE_MIN = 0.8  # share of the 8 x 8 grid with tie points
EVENNESS_MIN = 0.5  # uniformity of tie points per cell
GOOD_CELL_MAX_PX = 1.0  # a cell is good when its hold-out RMSE is at most this
GOOD_CELLS_MIN = 0.9  # share of cells with tie points that are good

NOTE = "Limits set by our team, to be tuned on more image pairs."


def _check(check_id: str, label: str, value: float | None, limit: float, at_most: bool, unit: str) -> dict:
    passed = value is not None and (value <= limit if at_most else value >= limit)
    return {
        "id": check_id,
        "label": label,
        "value": value,
        "limit": limit,
        "comparison": "<=" if at_most else ">=",
        "unit": unit,
        "passed": bool(passed),
    }


def evidence_level(passed: int, total: int) -> str:
    if passed == total:
        return "STRONG"
    return "MODERATE" if passed >= total - 2 else "WEAK"


def prove_score(
    holdout_rmse_px: float,
    putative_matches: int,
    coarse_inliers: int,
    coverage: float,
    uniformity: float,
    cells: list[dict],
) -> dict:
    """Run the five PROVE checks on the measurements of one registration.

    `cells` are per-cell statistics with an `rmse_px` entry (None for cells without tie points).
    """
    measured = [cell["rmse_px"] for cell in cells if cell["rmse_px"] is not None]
    good_cells = sum(value <= GOOD_CELL_MAX_PX for value in measured) / len(measured) if measured else None
    agreement = coarse_inliers / putative_matches if putative_matches else None

    checks = [
        _check("subpixel", "Sub-pixel on unseen blocks", holdout_rmse_px, SUBPIXEL_MAX_PX, True, "px"),
        _check("agreement", "Rough matches agree", agreement, MATCH_AGREEMENT_MIN, False, "%"),
        _check("coverage", "Image covered by tie points", coverage, COVERAGE_MIN, False, "%"),
        _check("evenness", "Tie points spread evenly", uniformity, EVENNESS_MIN, False, ""),
        _check("good_cells", "No weak regions", good_cells, GOOD_CELLS_MIN, False, "%"),
    ]
    passed = sum(check["passed"] for check in checks)
    return {
        "passed": passed,
        "total": len(checks),
        "evidence": evidence_level(passed, len(checks)),
        "checks": checks,
        "note": NOTE,
    }
