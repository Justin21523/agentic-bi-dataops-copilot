"""Entry point for ETL pipeline. Run via: make etl"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ingestion.loader import run_etl

if __name__ == "__main__":
    run_etl()
