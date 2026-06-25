# Data

This repo must not contain complete lyric text, line-by-line lyric text, or raw lyric documents.

`data/sample/` is generated locally and contains only:

- song and artist metadata
- bag-of-words derived features
- topic labels and scores
- sentiment scores and mood tags
- style embedding vectors
- genre predictions
- yearly term aggregates
- similarity results

## Prepare the local dataset

Use:

```bash
make data-ready
```

This generates a richer safe sample dataset, trains derived outputs, evaluates the MVP models, and loads DuckDB.

For licensed external data, place normalized CSV files in a local directory outside git and run:

```bash
backend/.venv/bin/python -m lyrics_lab.ingestion.prepare_data --input-dir /path/to/safe-derived-csv
```

The required files are `artists.csv`, `songs.csv`, and `lyric_bow_features.csv`. Validation fails if forbidden raw lyric columns are present.
