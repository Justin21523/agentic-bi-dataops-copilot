"""Generate synthetic retail CSV files into data/sample/.

The sample CSVs are already committed to the repository, so this script
is a no-op if they exist. It exists so `make sample-data` doesn't error.
"""
from __future__ import annotations

import sys
from pathlib import Path

SAMPLE_DIR = Path(__file__).parent.parent / "data" / "sample"
REQUIRED = ["customers", "products", "orders", "order_items", "payments", "reviews"]


def main() -> None:
    missing = [t for t in REQUIRED if not (SAMPLE_DIR / f"{t}.csv").exists()]
    if missing:
        print(f"ERROR: Missing sample CSVs: {missing}", file=sys.stderr)
        print(f"Expected in: {SAMPLE_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"Sample data already present in {SAMPLE_DIR}")
    for t in REQUIRED:
        path = SAMPLE_DIR / f"{t}.csv"
        lines = sum(1 for _ in open(path)) - 1  # subtract header
        print(f"  {t}.csv — {lines} rows")


if __name__ == "__main__":
    main()
