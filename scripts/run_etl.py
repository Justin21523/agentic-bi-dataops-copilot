"""CLI entry point: load sample CSVs into DuckDB warehouse."""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running as `python scripts/run_etl.py` from project root
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ingestion.loader import run_etl

if __name__ == "__main__":
    run_etl()
