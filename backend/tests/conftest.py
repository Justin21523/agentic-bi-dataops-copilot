from pathlib import Path

import pytest

from lyrics_lab.evaluation.run_evaluation import evaluate
from lyrics_lab.ingestion.etl import load_sample_to_duckdb
from lyrics_lab.ingestion.generate_sample_data import generate
from lyrics_lab.models.train import train
from lyrics_lab.utils.paths import sample_dir


@pytest.fixture(scope="session", autouse=True)
def prepared_sample_data():
    output = sample_dir()
    generate(output, song_count=60)
    train(output)
    evaluate(output)
    load_sample_to_duckdb(output, Path("data/sample/lyrics_lab.duckdb"))
    return output
