"""Evaluation metrics computation for Text2SQL benchmark results."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CaseResult:
    """Result of running one benchmark case."""

    case_id: str
    question: str
    generated_sql: str | None
    validation_passed: bool
    executed_successfully: bool
    was_correctly_rejected: bool
    should_be_rejected: bool
    rejection_reason: str | None
    execution_time_ms: float | None
    error: str | None
    difficulty: str = "easy"
    test_type: str = "safe_query"


def compute_metrics(results: list[CaseResult]) -> dict[str, Any]:
    """Compute aggregate evaluation metrics.

    Args:
        results: List of CaseResult from the evaluator.

    Returns:
        Dict with aggregate metrics and per-breakdown stats.
    """
    if not results:
        return {"total_cases": 0}

    safe_cases = [r for r in results if not r.should_be_rejected]
    unsafe_cases = [r for r in results if r.should_be_rejected]

    # valid_sql_rate: fraction of safe queries where SQL passed validation
    valid_sql_rate = (
        sum(1 for r in safe_cases if r.validation_passed) / len(safe_cases)
        if safe_cases else None
    )

    # execution_accuracy: fraction of valid SQLs that ran without error
    valid_and_executed = [r for r in safe_cases if r.validation_passed]
    execution_accuracy = (
        sum(1 for r in valid_and_executed if r.executed_successfully) / len(valid_and_executed)
        if valid_and_executed else None
    )

    # unsafe_rejection_rate: fraction of unsafe queries correctly blocked
    unsafe_rejection_rate = (
        sum(1 for r in unsafe_cases if r.was_correctly_rejected) / len(unsafe_cases)
        if unsafe_cases else None
    )

    # false_positive_rate: fraction of safe queries incorrectly blocked
    false_positive_rate = (
        sum(1 for r in safe_cases if not r.validation_passed) / len(safe_cases)
        if safe_cases else None
    )

    # Per-difficulty breakdown
    difficulties = {r.difficulty for r in results}
    per_difficulty: dict[str, dict] = {}
    for diff in difficulties:
        diff_safe = [r for r in safe_cases if r.difficulty == diff]
        diff_unsafe = [r for r in unsafe_cases if r.difficulty == diff]
        per_difficulty[diff] = {
            "total": len([r for r in results if r.difficulty == diff]),
            "valid_sql_rate": (
                sum(1 for r in diff_safe if r.validation_passed) / len(diff_safe)
                if diff_safe else None
            ),
            "execution_accuracy": (
                sum(1 for r in diff_safe if r.validation_passed and r.executed_successfully)
                / max(sum(1 for r in diff_safe if r.validation_passed), 1)
                if diff_safe else None
            ),
            "rejection_rate": (
                sum(1 for r in diff_unsafe if r.was_correctly_rejected) / len(diff_unsafe)
                if diff_unsafe else None
            ),
        }

    return {
        "total_cases": len(results),
        "safe_cases": len(safe_cases),
        "unsafe_cases": len(unsafe_cases),
        "valid_sql_rate": round(valid_sql_rate, 4) if valid_sql_rate is not None else None,
        "execution_accuracy": round(execution_accuracy, 4) if execution_accuracy is not None else None,
        "unsafe_rejection_rate": round(unsafe_rejection_rate, 4) if unsafe_rejection_rate is not None else None,
        "false_positive_rate": round(false_positive_rate, 4) if false_positive_rate is not None else None,
        "per_difficulty_breakdown": per_difficulty,
    }
