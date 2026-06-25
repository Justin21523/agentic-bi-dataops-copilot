"""Text2SQL benchmark evaluator: runs benchmark YAML cases end-to-end."""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from evaluation.metrics import CaseResult, compute_metrics
from features.catalog import load_catalog
from ingestion.warehouse import get_connection, create_schema
from models.llm_adapter import get_adapter
from preprocessing.query_executor import QueryExecutor, QueryError
from preprocessing.validator import validate_sql
from retrieval.schema_retriever import get_full_schema_prompt
from utils.config import get_settings
from utils.log import get_logger

log = get_logger(__name__)


@dataclass
class BenchmarkCase:
    """One evaluation case loaded from benchmark YAML."""

    id: str
    question: str
    expected_sql: str | None
    should_be_rejected: bool
    rejection_reason_contains: str | None
    tables_used: list[str]
    difficulty: str
    test_type: str


def load_benchmark(path: Path) -> list[BenchmarkCase]:
    """Load benchmark cases from YAML file."""
    with open(path) as f:
        raw = yaml.safe_load(f)
    cases = []
    for item in raw.get("benchmark", []):
        cases.append(
            BenchmarkCase(
                id=item["id"],
                question=item["question"],
                expected_sql=item.get("expected_sql"),
                should_be_rejected=item.get("should_be_rejected", False),
                rejection_reason_contains=item.get("rejection_reason_contains"),
                tables_used=item.get("tables_used", []),
                difficulty=item.get("difficulty", "easy"),
                test_type=item.get("test_type", "safe_query"),
            )
        )
    return cases


def run_evaluation(
    adapter_name: str = "rule_based",
    db_path: str | None = None,
    benchmark_path: Path | None = None,
    few_shot_path: Path | None = None,
    output_path: Path | None = None,
) -> dict[str, Any]:
    """Run full Text2SQL evaluation against the benchmark.

    Args:
        adapter_name: "rule_based" or "openai".
        db_path: DuckDB warehouse path.
        benchmark_path: Path to benchmark YAML.
        few_shot_path: Path to few-shot examples YAML.
        output_path: Where to write JSON report (None = stdout only).

    Returns:
        Evaluation report dict.
    """
    settings = get_settings()
    db_path = db_path or settings.duckdb_path
    benchmark_path = benchmark_path or Path("configs/benchmark_queries.yaml")
    few_shot_path = few_shot_path or Path("configs/few_shot_examples.yaml")

    catalog = load_catalog()
    adapter = get_adapter(adapter_name)
    schema_context = get_full_schema_prompt(catalog)
    few_shot = []
    if few_shot_path.exists():
        from models.base import FewShotExample
        few_shot = FewShotExample.load_from_yaml(few_shot_path)

    conn = get_connection(db_path)
    create_schema(conn)
    executor = QueryExecutor(
        db_path=":memory:",
        history_conn=conn,
        strict_validation=False,  # evaluation mode: warnings don't block
    )
    executor._conn = conn  # reuse the single writable connection for queries

    cases = load_benchmark(benchmark_path)
    log.info(f"Running evaluation: {len(cases)} cases, adapter={adapter.adapter_name}")

    results: list[CaseResult] = []
    for case in cases:
        log.info(f"  [{case.id}] {case.question[:60]}")

        generated_sql: str | None = None
        validation_passed = False
        executed_successfully = False
        was_correctly_rejected = False
        rejection_reason: str | None = None
        exec_time: float | None = None
        error: str | None = None

        try:
            generated_sql = adapter.generate_sql(case.question, schema_context, few_shot)
        except NotImplementedError:
            generated_sql = None
            error = "No template matched"

        if generated_sql:
            vresult = validate_sql(generated_sql, strict=False)
            validation_passed = vresult.is_safe

            if case.should_be_rejected:
                was_correctly_rejected = not vresult.is_safe
                if not was_correctly_rejected:
                    error = "Expected rejection but query passed validation"
            elif validation_passed:
                qresult = executor.execute(generated_sql, question=case.question)
                if isinstance(qresult, QueryError):
                    executed_successfully = False
                    error = qresult.message
                else:
                    executed_successfully = True
                    exec_time = qresult.execution_time_ms
        elif case.should_be_rejected and generated_sql is None:
            was_correctly_rejected = True

        results.append(
            CaseResult(
                case_id=case.id,
                question=case.question,
                generated_sql=generated_sql,
                validation_passed=validation_passed,
                executed_successfully=executed_successfully,
                was_correctly_rejected=was_correctly_rejected,
                should_be_rejected=case.should_be_rejected,
                rejection_reason=rejection_reason,
                execution_time_ms=exec_time,
                error=error,
                difficulty=case.difficulty,
                test_type=case.test_type,
            )
        )

    executor.close()
    conn.close()

    metrics = compute_metrics(results)
    report = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "adapter": adapter.adapter_name,
        "metrics": metrics,
        "cases": [
            {
                "id": r.case_id,
                "question": r.question,
                "generated_sql": r.generated_sql,
                "validation_passed": r.validation_passed,
                "executed_successfully": r.executed_successfully,
                "was_correctly_rejected": r.was_correctly_rejected,
                "error": r.error,
                "execution_time_ms": r.execution_time_ms,
                "difficulty": r.difficulty,
            }
            for r in results
        ],
    }

    print(json.dumps(metrics, indent=2))

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(report, f, indent=2)
        log.info(f"Evaluation report written to {output_path}")

    return report


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run Text2SQL evaluation")
    parser.add_argument("--adapter", default="rule_based")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    output = Path(args.output) if args.output else None
    run_evaluation(adapter_name=args.adapter, output_path=output)
