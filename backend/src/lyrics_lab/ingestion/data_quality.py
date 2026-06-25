from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from lyrics_lab.evaluation.safety_checks import FORBIDDEN_FIELDS


def build_quality_report(input_dir: Path) -> dict[str, object]:
    report: dict[str, object] = {"status": "pass", "tables": {}, "issues": [], "safety": {"no_raw_lyrics": True}}
    frames: dict[str, pd.DataFrame] = {}
    for name in ["artists", "songs", "lyric_bow_features"]:
        path = input_dir / f"{name}.csv"
        if path.exists():
            df = pd.read_csv(path)
            frames[name] = df
            forbidden = sorted(set(df.columns) & FORBIDDEN_FIELDS)
            if forbidden:
                report["status"] = "fail"
                report["safety"] = {"no_raw_lyrics": False, "forbidden_fields": forbidden}
            report["tables"][name] = {"rows": int(len(df)), "columns": list(df.columns)}

    if "songs" in frames:
        songs = frames["songs"]
        report["coverage"] = {
            "year_from": int(songs["year"].min()) if len(songs) else None,
            "year_to": int(songs["year"].max()) if len(songs) else None,
            "genres": sorted(songs["genre"].dropna().unique().tolist()),
            "languages": sorted(songs["language"].dropna().unique().tolist()),
        }
        duplicated = int(songs["song_id"].duplicated().sum())
        if duplicated:
            report["issues"].append({"type": "duplicate_song_ids", "count": duplicated})
    if "artists" in frames and "songs" in frames:
        missing_artists = sorted(set(frames["songs"]["artist_id"]) - set(frames["artists"]["artist_id"]))
        if missing_artists:
            report["issues"].append({"type": "unmatched_artist_ids", "count": len(missing_artists), "sample": missing_artists[:10]})
    if "songs" in frames and "lyric_bow_features" in frames:
        missing_bow = sorted(set(frames["lyric_bow_features"]["song_id"]) - set(frames["songs"]["song_id"]))
        if missing_bow:
            report["issues"].append({"type": "unmatched_bow_song_ids", "count": len(missing_bow), "sample": missing_bow[:10]})

    (input_dir / "data_quality_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
