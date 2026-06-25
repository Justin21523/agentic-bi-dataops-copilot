from __future__ import annotations

import argparse
import json
from pathlib import Path

from lyrics_lab.evaluation.evaluate_classifier import classifier_details, evaluate_classifier
from lyrics_lab.evaluation.evaluate_retrieval import evaluate_retrieval, retrieval_examples, retrieval_good_bad_examples
from lyrics_lab.evaluation.evaluate_topics import evaluate_topics
from lyrics_lab.evaluation.safety_checks import safety_audit_payload
from lyrics_lab.utils.paths import sample_dir


def evaluate(input_dir: Path = sample_dir()) -> dict[str, object]:
    metrics: dict[str, object] = {}
    metrics.update(evaluate_classifier(input_dir))
    metrics.update(classifier_details(input_dir))
    metrics.update(evaluate_retrieval(input_dir))
    metrics["retrieval_examples"] = retrieval_examples(input_dir)
    metrics.update(retrieval_good_bad_examples(input_dir))
    metrics.update(evaluate_topics(input_dir))
    metrics["safety"] = safety_audit_payload()
    (input_dir / "evaluation.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, default=sample_dir())
    args = parser.parse_args()
    print(json.dumps(evaluate(args.input_dir), indent=2))


if __name__ == "__main__":
    main()
