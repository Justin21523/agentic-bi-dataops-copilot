# Local Licensed Raw Inputs

Place licensed local source files here only if you have permission to use them.

Do not commit raw inputs. This directory is git-ignored except for this README.

The import workflow expects normalized safe-derived CSVs with at least:

- `artists.csv`
- `songs.csv`
- `lyric_bow_features.csv`

Run:

```bash
make import-data INPUT=/absolute/path/to/safe-derived-csv
```

The importer maps common musiXmatch/WASABI-style aliases, rejects forbidden lyric fields, enriches metadata, trains derived outputs, evaluates models, writes `data_quality_report.json`, and loads DuckDB.
