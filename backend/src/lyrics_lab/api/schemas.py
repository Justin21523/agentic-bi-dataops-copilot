from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SafeModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(SafeModel):
    status: str
    app: str


class Artist(SafeModel):
    artist_id: str
    artist_name: str
    country: str | None = None
    region: str | None = None
    active_start_year: int | None = None
    active_end_year: int | None = None


class Song(SafeModel):
    song_id: str
    title: str
    artist_id: str
    artist_name: str | None = None
    album: str | None = None
    year: int | None = None
    decade: int | None = None
    language: str | None = None
    language_family: str | None = None
    genre: str | None = None


class Topic(SafeModel):
    song_id: str
    topic_id: int
    topic_label: str
    topic_score: float


class Sentiment(SafeModel):
    song_id: str
    sentiment_score: float
    sentiment_label: str
    mood_tags: list[str]


class SimilarSong(SafeModel):
    song_id: str
    similar_song_id: str
    title: str
    artist_name: str
    genre: str
    year: int
    similarity_score: float
    method: str


class GenrePredictionRequest(SafeModel):
    features: dict[str, float] = Field(default_factory=dict)


class GenrePredictionResponse(SafeModel):
    predicted_genre: str
    confidence: float
    scores: dict[str, float]


class Overview(SafeModel):
    total_songs: int
    total_artists: int
    topic_count: int
    genre_count: int
    language_count: int
    year_from: int | None
    year_to: int | None
    evaluation: dict[str, Any]
