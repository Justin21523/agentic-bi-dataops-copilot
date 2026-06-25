from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from lyrics_lab.api.deps import get_db
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics
from lyrics_lab.utils.paths import sample_dir

router = APIRouter(prefix="/export", tags=["export"])

EXPORT_SQL = {
    "songs": "SELECT s.song_id, s.title, a.artist_name, s.album, s.year, s.decade, s.language, s.language_family, s.genre FROM songs s JOIN artists a ON s.artist_id = a.artist_id",
    "topics": "SELECT * FROM lyric_topics",
    "sentiment": "SELECT * FROM sentiment_scores",
    "yearly_terms": "SELECT * FROM yearly_terms",
    "similarity": "SELECT * FROM similar_songs",
}


@router.get("/{resource}.csv")
def export_csv(resource: str, con=Depends(get_db)):
    if resource == "evaluation":
        path = sample_dir() / "evaluation.json"
        df = pd.read_json(path, typ="series").reset_index()
        df.columns = ["metric", "value"]
    elif resource in EXPORT_SQL:
        df = con.execute(EXPORT_SQL[resource]).fetchdf()
    else:
        raise HTTPException(status_code=404, detail="Export resource not found")
    records = df.to_dict("records")
    assert_no_raw_lyrics(records)
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{resource}.csv"'},
    )
