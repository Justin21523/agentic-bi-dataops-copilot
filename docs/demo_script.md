# Demo Script

1. Run `make install`.
2. Run `make data-ready`.
3. Optionally run `make test`.
4. Review `data/sample/evaluation.json`.
5. Confirm `data/sample/lyrics_lab.duckdb` exists.
6. Start the backend with `make api`.
7. Start the frontend with `make frontend`.
8. Open `http://localhost:5173`.
9. Confirm the default UI is Traditional Chinese.
10. Switch to English and confirm page labels, chart labels, and states update.
11. Search a song, inspect similar songs, open topic and sentiment pages, and review safety/licensing.
12. Use Demo Mode on Overview to load a recommended topic, song, or artist.
13. Run `make test-e2e` while the dev servers are running to smoke-test major pages.

## Portfolio Walkthrough Checklist

- Start on Overview and use the analysis story to frame the demo.
- Show safety policy and confirm the app does not display complete lyrics.
- Run `make import-fixture`, then open Evaluation to show the data quality report.
- Use filters on Topic Explorer and open a topic drill-down.
- Open Similar Songs and explain shared BoW terms and genre match/mismatch.
- Open Evaluation and compare majority baseline vs TF-IDF classifier.
- Export a safe CSV from `/api/v1/export/songs.csv`.
