from fastapi import APIRouter, Depends, HTTPException, Query

from lyrics_lab.api.deps import get_db
from lyrics_lab.api.query_utils import limit_clause
from lyrics_lab.api.schemas import Sentiment, SimilarSong, Song, Topic
from lyrics_lab.utils.serialization import loads_json

router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("/search", response_model=list[Song])
def search_songs(
    q: str = "",
    genre: str | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    language: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    con=Depends(get_db),
):
    sql = """
        SELECT s.song_id, s.title, s.artist_id, a.artist_name, s.album, s.year, s.decade, s.language, s.language_family, s.genre
        FROM songs s JOIN artists a ON s.artist_id = a.artist_id
        WHERE lower(s.title || ' ' || a.artist_name) LIKE ?
    """
    params: list[object] = [f"%{q.lower()}%"]
    if genre:
        sql += " AND s.genre = ?"
        params.append(genre)
    if year_from:
        sql += " AND s.year >= ?"
        params.append(year_from)
    if year_to:
        sql += " AND s.year <= ?"
        params.append(year_to)
    if language:
        sql += " AND s.language = ?"
        params.append(language)
    sql += " ORDER BY s.year DESC LIMIT ?"
    params.append(limit)
    return [Song(**row) for row in con.execute(sql, params).fetchdf().to_dict("records")]


@router.get("/options")
def song_options(limit: int = Query(100, ge=1, le=300), con=Depends(get_db)):
    return con.execute(
        """
        SELECT s.song_id, s.title, a.artist_name, s.genre, s.year
        FROM songs s JOIN artists a ON s.artist_id = a.artist_id
        ORDER BY s.year DESC, s.title
        LIMIT ?
        """,
        [limit_clause(limit, 100, 300)],
    ).fetchdf().to_dict("records")


@router.get("/{song_id}", response_model=Song)
def get_song(song_id: str, con=Depends(get_db)):
    rows = con.execute(
        """
        SELECT s.song_id, s.title, s.artist_id, a.artist_name, s.album, s.year, s.decade, s.language, s.language_family, s.genre
        FROM songs s JOIN artists a ON s.artist_id = a.artist_id
        WHERE s.song_id = ?
        """,
        [song_id],
    ).fetchdf().to_dict("records")
    if not rows:
        raise HTTPException(status_code=404, detail="Song not found")
    return Song(**rows[0])


@router.get("/{song_id}/similar", response_model=list[SimilarSong])
def get_similar(song_id: str, method: str | None = None, con=Depends(get_db)):
    sql = """
        SELECT ss.song_id, ss.similar_song_id, s.title, a.artist_name, s.genre, s.year,
               ss.similarity_score, ss.method
        FROM similar_songs ss
        JOIN songs s ON ss.similar_song_id = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE ss.song_id = ?
    """
    params: list[object] = [song_id]
    if method:
        sql += " AND ss.method = ?"
        params.append(method)
    sql += " ORDER BY ss.similarity_score DESC LIMIT 10"
    return [SimilarSong(**row) for row in con.execute(sql, params).fetchdf().to_dict("records")]


@router.get("/{song_id}/similar/explanations")
def get_similarity_explanations(song_id: str, method: str = "tfidf", limit: int = 5, con=Depends(get_db)):
    rows = con.execute(
        """
        SELECT ss.similar_song_id, ss.similarity_score, ss.method, s.title, a.artist_name, s.genre, s.year
        FROM similar_songs ss
        JOIN songs s ON ss.similar_song_id = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE ss.song_id = ? AND ss.method = ?
        ORDER BY ss.similarity_score DESC
        LIMIT ?
        """,
        [song_id, method, limit_clause(limit, 5, 20)],
    ).fetchdf().to_dict("records")
    source_genre = con.execute("SELECT genre FROM songs WHERE song_id = ?", [song_id]).fetchone()
    source_terms = {
        row[0]
        for row in con.execute(
            "SELECT term FROM lyric_bow_features WHERE song_id = ? ORDER BY weight DESC LIMIT 12",
            [song_id],
        ).fetchall()
    }
    source_topics = {
        row[0]: row[1]
        for row in con.execute("SELECT topic_id, topic_label FROM lyric_topics WHERE song_id = ?", [song_id]).fetchall()
    }
    explanations = []
    for row in rows:
        target_terms = {
            item[0]
            for item in con.execute(
                "SELECT term FROM lyric_bow_features WHERE song_id = ? ORDER BY weight DESC LIMIT 12",
                [row["similar_song_id"]],
            ).fetchall()
        }
        target_topics = {
            item[0]: item[1]
            for item in con.execute("SELECT topic_id, topic_label FROM lyric_topics WHERE song_id = ?", [row["similar_song_id"]]).fetchall()
        }
        shared_topic_ids = sorted(set(source_topics) & set(target_topics))
        explanations.append(
            {
                **row,
                "shared_terms": sorted(source_terms & target_terms)[:8],
                "shared_topics": [{"topic_id": tid, "topic_label": source_topics[tid]} for tid in shared_topic_ids],
                "genre_match": bool(source_genre and source_genre[0] == row["genre"]),
            }
        )
    return explanations


@router.get("/{song_id}/similar/graph")
def get_similarity_graph(song_id: str, method: str = "tfidf", limit: int = 8, con=Depends(get_db)):
    source = con.execute(
        """
        SELECT s.song_id, s.title, a.artist_name, s.genre, s.year
        FROM songs s JOIN artists a ON s.artist_id = a.artist_id
        WHERE s.song_id = ?
        """,
        [song_id],
    ).fetchdf().to_dict("records")
    if not source:
        raise HTTPException(status_code=404, detail="Song not found")
    explanations = get_similarity_explanations(song_id, method, limit, con)
    source_node = {
        "id": song_id,
        "type": "song",
        "label": source[0]["title"],
        "artist_name": source[0]["artist_name"],
        "genre": source[0]["genre"],
        "year": source[0]["year"],
        "role": "source",
    }
    nodes = [source_node]
    edges = []
    explanation_nodes = []
    for index, item in enumerate(explanations):
        target_id = item["similar_song_id"]
        nodes.append(
            {
                "id": target_id,
                "type": "song",
                "label": item["title"],
                "artist_name": item["artist_name"],
                "genre": item["genre"],
                "year": item["year"],
                "role": "target",
            }
        )
        terms_id = f"{song_id}-{target_id}-terms"
        topics_id = f"{song_id}-{target_id}-topics"
        shared_terms = item.get("shared_terms", [])
        shared_topics = item.get("shared_topics", [])
        if shared_terms:
            explanation_nodes.append({"id": terms_id, "type": "explanation", "label": ", ".join(shared_terms[:4]), "role": "shared_terms"})
            edges.append({"id": f"{song_id}-{terms_id}", "source": song_id, "target": terms_id, "weight": 0.3, "label": "shared terms"})
            edges.append({"id": f"{terms_id}-{target_id}", "source": terms_id, "target": target_id, "weight": item["similarity_score"], "label": f"{item['similarity_score']:.2f}"})
        if shared_topics:
            explanation_nodes.append({"id": topics_id, "type": "explanation", "label": ", ".join(topic["topic_label"] for topic in shared_topics[:2]), "role": "shared_topics"})
            edges.append({"id": f"{song_id}-{topics_id}", "source": song_id, "target": topics_id, "weight": 0.3, "label": "shared topics"})
            edges.append({"id": f"{topics_id}-{target_id}", "source": topics_id, "target": target_id, "weight": item["similarity_score"], "label": f"{item['similarity_score']:.2f}"})
        if not shared_terms and not shared_topics:
            edges.append({"id": f"{song_id}-{target_id}", "source": song_id, "target": target_id, "weight": item["similarity_score"], "label": f"{item['similarity_score']:.2f}"})
        edges.append(
            {
                "id": f"rank-{index}-{song_id}-{target_id}",
                "source": song_id,
                "target": target_id,
                "weight": item["similarity_score"],
                "label": f"{round(item['similarity_score'] * 100)}%",
                "genre_match": item["genre_match"],
                "method": item["method"],
                "hidden": bool(shared_terms or shared_topics),
            }
        )
    return {"source": source_node, "nodes": nodes + explanation_nodes, "edges": edges, "explanations": explanations}


@router.get("/{song_id}/topics", response_model=list[Topic])
def get_song_topics(song_id: str, con=Depends(get_db)):
    rows = con.execute("SELECT * FROM lyric_topics WHERE song_id = ? ORDER BY topic_score DESC", [song_id]).fetchdf()
    return [Topic(**row) for row in rows.to_dict("records")]


@router.get("/{song_id}/sentiment", response_model=Sentiment)
def get_song_sentiment(song_id: str, con=Depends(get_db)):
    rows = con.execute("SELECT * FROM sentiment_scores WHERE song_id = ?", [song_id]).fetchdf().to_dict("records")
    if not rows:
        raise HTTPException(status_code=404, detail="Sentiment not found")
    row = rows[0]
    row["mood_tags"] = loads_json(row["mood_tags"], [])
    return Sentiment(**row)
