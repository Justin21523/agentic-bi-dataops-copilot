import json

from fastapi import APIRouter, Depends, Query
import numpy as np

from lyrics_lab.api.deps import get_db
from lyrics_lab.api.query_utils import analytics_filters, limit_clause
from lyrics_lab.api.schemas import Overview
from lyrics_lab.features.style_embeddings import artist_style_fingerprint
from lyrics_lab.utils.paths import sample_dir
from lyrics_lab.utils.serialization import loads_json

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=Overview)
def overview(con=Depends(get_db)):
    evaluation_path = sample_dir() / "evaluation.json"
    evaluation = json.loads(evaluation_path.read_text(encoding="utf-8")) if evaluation_path.exists() else {}
    row = con.execute(
        """
        SELECT
          (SELECT count(*) FROM songs) AS total_songs,
          (SELECT count(*) FROM artists) AS total_artists,
          (SELECT count(DISTINCT topic_id) FROM lyric_topics) AS topic_count,
          (SELECT count(DISTINCT genre) FROM songs) AS genre_count,
          (SELECT count(DISTINCT language) FROM songs) AS language_count,
          (SELECT min(year) FROM songs) AS year_from,
          (SELECT max(year) FROM songs) AS year_to
        """
    ).fetchdf().to_dict("records")[0]
    row["evaluation"] = evaluation
    return Overview(**row)


@router.get("/topics")
def topics(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT lt.topic_id, lt.topic_label, count(*) AS song_count, avg(lt.topic_score) AS average_score
        FROM lyric_topics lt
        JOIN songs s ON lt.song_id = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE 1=1 {where}
        GROUP BY lt.topic_id, lt.topic_label
        ORDER BY song_count DESC
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/sentiment-trends")
def sentiment_trends(group_by: str = "year", genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    field = {"year": "s.year", "genre": "s.genre", "decade": "s.decade", "language": "s.language"}.get(group_by, "s.year")
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT {field} AS bucket, avg(ss.sentiment_score) AS sentiment_score
        FROM songs s
        JOIN artists a ON s.artist_id = a.artist_id
        JOIN sentiment_scores ss ON s.song_id = ss.song_id
        WHERE 1=1 {where}
        GROUP BY bucket ORDER BY bucket
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/yearly-terms")
def yearly_terms(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT yt.year, yt.term, avg(yt.score) AS score, min(yt.rank) AS rank
        FROM yearly_terms yt
        JOIN songs s ON yt.year = s.year
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE 1=1 {where}
        GROUP BY yt.year, yt.term
        ORDER BY yt.year, rank
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/genres")
def genres(con=Depends(get_db)):
    return con.execute("SELECT genre, count(*) AS song_count FROM songs GROUP BY genre ORDER BY song_count DESC").fetchdf().to_dict("records")


@router.get("/languages")
def languages(con=Depends(get_db)):
    return con.execute("SELECT language, count(*) AS song_count FROM songs GROUP BY language ORDER BY song_count DESC").fetchdf().to_dict("records")


@router.get("/decade-trends")
def decade_trends(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT s.decade, yt.term, avg(yt.score) AS score, min(yt.rank) AS best_rank, count(*) AS observations
        FROM yearly_terms yt
        JOIN songs s ON yt.year = s.year
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE 1=1 {where}
        GROUP BY s.decade, yt.term
        QUALIFY row_number() OVER (PARTITION BY s.decade ORDER BY avg(yt.score) DESC, min(yt.rank)) <= 10
        ORDER BY decade, score DESC
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/genre-sentiment")
def genre_sentiment(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT s.genre, s.decade, count(*) AS song_count,
               avg(ss.sentiment_score) AS sentiment_score,
               sum(CASE WHEN ss.sentiment_label = 'positive' THEN 1 ELSE 0 END) AS positive_count,
               sum(CASE WHEN ss.sentiment_label = 'neutral' THEN 1 ELSE 0 END) AS neutral_count,
               sum(CASE WHEN ss.sentiment_label = 'negative' THEN 1 ELSE 0 END) AS negative_count
        FROM songs s
        JOIN artists a ON s.artist_id = a.artist_id
        JOIN sentiment_scores ss ON s.song_id = ss.song_id
        WHERE 1=1 {where}
        GROUP BY s.genre, s.decade
        ORDER BY s.genre, s.decade
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/topic-decade")
def topic_decade(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT lt.topic_id, lt.topic_label, s.decade, count(*) AS song_count,
               avg(lt.topic_score) AS average_score
        FROM lyric_topics lt
        JOIN songs s ON lt.song_id = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE 1=1 {where}
        GROUP BY lt.topic_id, lt.topic_label, s.decade
        ORDER BY s.decade, song_count DESC
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/language-culture")
def language_culture(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT s.language, s.language_family, a.region, s.decade, count(*) AS song_count,
               avg(ss.sentiment_score) AS sentiment_score
        FROM songs s
        JOIN artists a ON s.artist_id = a.artist_id
        JOIN sentiment_scores ss ON s.song_id = ss.song_id
        WHERE 1=1 {where}
        GROUP BY s.language, s.language_family, a.region, s.decade
        ORDER BY s.decade, song_count DESC
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/artist-style-clusters")
def artist_style_clusters(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    songs = con.execute(f"SELECT s.* FROM songs s JOIN artists a ON s.artist_id = a.artist_id WHERE 1=1 {where}", params).fetchdf()
    artists = con.execute("SELECT * FROM artists").fetchdf()
    if region:
        artists = artists[artists["region"] == region]
    embeddings = con.execute("SELECT * FROM style_embeddings").fetchdf()
    rows = []
    for artist in artists.to_dict("records"):
        fingerprint = artist_style_fingerprint(songs, embeddings, artist["artist_id"])
        values = np.array(list(fingerprint.values()), dtype=float)
        if values.mean() >= 0.62:
            cluster = "high-distinction"
        elif fingerprint["genre_consistency"] >= 0.6:
            cluster = "genre-focused"
        else:
            cluster = "cross-style"
        rows.append(
            {
                "artist_id": artist["artist_id"],
                "artist_name": artist["artist_name"],
                "region": artist.get("region"),
                "cluster": cluster,
                **fingerprint,
            }
        )
    return rows


@router.get("/genre-leakage")
def genre_leakage(genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region, song_alias="base", artist_alias="a")
    return con.execute(
        f"""
        SELECT ss.method, base.genre AS source_genre, sim.genre AS similar_genre,
               count(*) AS pair_count,
               avg(ss.similarity_score) AS similarity_score,
               avg(CASE WHEN base.genre = sim.genre THEN 1.0 ELSE 0.0 END) AS same_genre_rate
        FROM similar_songs ss
        JOIN songs base ON ss.song_id = base.song_id
        JOIN artists a ON base.artist_id = a.artist_id
        JOIN songs sim ON ss.similar_song_id = sim.song_id
        WHERE 1=1 {where}
        GROUP BY ss.method, base.genre, sim.genre
        ORDER BY ss.method, pair_count DESC
        """,
        params,
    ).fetchdf().to_dict("records")


@router.get("/topics/{topic_id}/songs")
def topic_songs(topic_id: int, limit: int = 12, genre: str | None = None, language: str | None = None, decade: int | None = None, region: str | None = None, con=Depends(get_db)):
    where, params = analytics_filters(genre, language, decade, region)
    return con.execute(
        f"""
        SELECT s.song_id, s.title, s.artist_id, a.artist_name, s.album, s.year, s.decade,
               s.language, s.language_family, s.genre, lt.topic_label, lt.topic_score
        FROM lyric_topics lt
        JOIN songs s ON lt.song_id = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        WHERE lt.topic_id = ?
        {where}
        ORDER BY lt.topic_score DESC
        LIMIT ?
        """,
        [topic_id, *params, limit_clause(limit, 12)],
    ).fetchdf().to_dict("records")


@router.get("/filter-options")
def filter_options(con=Depends(get_db)):
    return {
        "genres": [row[0] for row in con.execute("SELECT DISTINCT genre FROM songs ORDER BY genre").fetchall()],
        "languages": [row[0] for row in con.execute("SELECT DISTINCT language FROM songs ORDER BY language").fetchall()],
        "decades": [row[0] for row in con.execute("SELECT DISTINCT decade FROM songs ORDER BY decade").fetchall()],
        "regions": [row[0] for row in con.execute("SELECT DISTINCT region FROM artists ORDER BY region").fetchall()],
    }


@router.get("/topics/{topic_id}/terms")
def topic_terms(topic_id: int, limit: int = 12, con=Depends(get_db)):
    return con.execute(
        """
        SELECT lt.topic_id, lt.topic_label, b.term, avg(b.weight * lt.topic_score) AS score
        FROM lyric_topics lt
        JOIN lyric_bow_features b ON lt.song_id = b.song_id
        WHERE lt.topic_id = ?
        GROUP BY lt.topic_id, lt.topic_label, b.term
        ORDER BY score DESC
        LIMIT ?
        """,
        [topic_id, limit_clause(limit, 12)],
    ).fetchdf().to_dict("records")


@router.get("/topic-quality")
def topic_quality(con=Depends(get_db)):
    topic_rows = con.execute(
        """
        SELECT lt.topic_id, lt.topic_label, count(*) AS song_count, avg(lt.topic_score) AS average_score
        FROM lyric_topics lt
        GROUP BY lt.topic_id, lt.topic_label
        ORDER BY lt.topic_id
        """
    ).fetchdf().to_dict("records")
    rows = []
    for topic in topic_rows:
        terms = con.execute(
            """
            SELECT b.term, avg(b.weight * lt.topic_score) AS score
            FROM lyric_topics lt
            JOIN lyric_bow_features b ON lt.song_id = b.song_id
            WHERE lt.topic_id = ?
            GROUP BY b.term
            ORDER BY score DESC
            LIMIT 8
            """,
            [topic["topic_id"]],
        ).fetchdf().to_dict("records")
        scores = [float(item["score"]) for item in terms]
        coherence = round(float(np.mean(scores) / max(scores)) if scores else 0.0, 3)
        rows.append({**topic, "top_terms": terms, "coherence": coherence})
    return rows


@router.get("/drilldown/songs")
def drilldown_songs(
    genre: str | None = None,
    language: str | None = None,
    decade: int | None = None,
    region: str | None = None,
    term: str | None = None,
    topic_id: int | None = None,
    sentiment_label: str | None = None,
    artist_id: str | None = None,
    predicted_genre: str | None = None,
    limit: int = Query(25, ge=1, le=100),
    con=Depends(get_db),
):
    where, params = analytics_filters(genre, language, decade, region)
    joins = ""
    select_prediction = ""
    if term:
        joins += " JOIN lyric_bow_features b ON s.song_id = b.song_id"
        where += " AND b.term = ?"
        params.append(term)
    if topic_id is not None:
        joins += " JOIN lyric_topics lt ON s.song_id = lt.song_id"
        where += " AND lt.topic_id = ?"
        params.append(topic_id)
    if sentiment_label:
        joins += " JOIN sentiment_scores ss ON s.song_id = ss.song_id"
        where += " AND ss.sentiment_label = ?"
        params.append(sentiment_label)
    if artist_id:
        where += " AND s.artist_id = ?"
        params.append(artist_id)
    if predicted_genre:
        joins += " JOIN genre_predictions gp ON s.song_id = gp.song_id"
        select_prediction = ", gp.predicted_genre, gp.confidence AS prediction_confidence"
        where += " AND gp.predicted_genre = ?"
        params.append(predicted_genre)
    return con.execute(
        f"""
        SELECT DISTINCT s.song_id, s.title, s.artist_id, a.artist_name, s.album, s.year, s.decade,
               s.language, s.language_family, s.genre
               {select_prediction}
        FROM songs s
        JOIN artists a ON s.artist_id = a.artist_id
        {joins}
        WHERE 1=1 {where}
        ORDER BY s.year DESC
        LIMIT ?
        """,
        [*params, limit_clause(limit, 25, 100)],
    ).fetchdf().to_dict("records")


@router.get("/highlights")
def highlights(con=Depends(get_db)):
    rising = con.execute("SELECT decade, term, score FROM yearly_terms yt JOIN songs s ON yt.year = s.year WHERE s.decade = 2020 ORDER BY score DESC LIMIT 3").fetchdf().to_dict("records")
    sentiment = con.execute(
        """
        SELECT s.genre, avg(ss.sentiment_score) AS sentiment_score
        FROM songs s JOIN sentiment_scores ss ON s.song_id = ss.song_id
        GROUP BY s.genre ORDER BY sentiment_score DESC LIMIT 2
        """
    ).fetchdf().to_dict("records")
    culture = con.execute("SELECT a.region, s.language_family, count(*) AS song_count FROM songs s JOIN artists a ON s.artist_id = a.artist_id GROUP BY a.region, s.language_family ORDER BY song_count DESC LIMIT 1").fetchdf().to_dict("records")
    return {"rising_terms": rising, "sentiment_contrast": sentiment, "top_culture_segment": culture, "safety_status": "pass"}
