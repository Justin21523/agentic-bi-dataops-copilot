import math

from fastapi import APIRouter, Depends, HTTPException

from lyrics_lab.api.deps import get_db
from lyrics_lab.api.schemas import Artist, Song
from lyrics_lab.features.style_embeddings import artist_style_fingerprint

router = APIRouter(prefix="/artists", tags=["artists"])


def _records_without_nan(rows):
    cleaned = []
    for row in rows:
        cleaned.append({key: None if isinstance(value, float) and math.isnan(value) else value for key, value in row.items()})
    return cleaned


@router.get("/search", response_model=list[Artist])
def search_artists(q: str = "", con=Depends(get_db)):
    rows = con.execute(
        "SELECT * FROM artists WHERE lower(artist_name) LIKE ? ORDER BY artist_name LIMIT 20",
        [f"%{q.lower()}%"],
    ).fetchdf().to_dict("records")
    return [Artist(**row) for row in _records_without_nan(rows)]


@router.get("/{artist_id}", response_model=Artist)
def get_artist(artist_id: str, con=Depends(get_db)):
    rows = con.execute("SELECT * FROM artists WHERE artist_id = ?", [artist_id]).fetchdf().to_dict("records")
    if not rows:
        raise HTTPException(status_code=404, detail="Artist not found")
    return Artist(**_records_without_nan(rows)[0])


@router.get("/{artist_id}/songs", response_model=list[Song])
def get_artist_songs(artist_id: str, con=Depends(get_db)):
    rows = con.execute(
        """
        SELECT s.song_id, s.title, s.artist_id, a.artist_name, s.album, s.year, s.decade, s.language, s.language_family, s.genre
        FROM songs s JOIN artists a ON s.artist_id = a.artist_id
        WHERE s.artist_id = ? ORDER BY s.year DESC
        """,
        [artist_id],
    ).fetchdf().to_dict("records")
    return [Song(**row) for row in _records_without_nan(rows)]


@router.get("/{artist_id}/style")
def get_artist_style(artist_id: str, con=Depends(get_db)):
    songs = con.execute("SELECT * FROM songs").fetchdf()
    embeddings = con.execute("SELECT * FROM style_embeddings").fetchdf()
    return {"artist_id": artist_id, "fingerprint": artist_style_fingerprint(songs, embeddings, artist_id)}
