CREATE TABLE IF NOT EXISTS artists (
  artist_id VARCHAR PRIMARY KEY,
  artist_name VARCHAR NOT NULL,
  country VARCHAR,
  region VARCHAR,
  active_start_year INTEGER,
  active_end_year INTEGER
);

CREATE TABLE IF NOT EXISTS songs (
  song_id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  artist_id VARCHAR NOT NULL,
  album VARCHAR,
  year INTEGER,
  decade INTEGER,
  language VARCHAR,
  language_family VARCHAR,
  genre VARCHAR
);

CREATE TABLE IF NOT EXISTS lyric_bow_features (
  song_id VARCHAR NOT NULL,
  term VARCHAR NOT NULL,
  weight DOUBLE NOT NULL,
  source VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS lyric_topics (
  song_id VARCHAR NOT NULL,
  topic_id INTEGER NOT NULL,
  topic_label VARCHAR NOT NULL,
  topic_score DOUBLE NOT NULL
);

CREATE TABLE IF NOT EXISTS sentiment_scores (
  song_id VARCHAR NOT NULL,
  sentiment_score DOUBLE NOT NULL,
  sentiment_label VARCHAR NOT NULL,
  mood_tags VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS style_embeddings (
  song_id VARCHAR NOT NULL,
  embedding_json VARCHAR NOT NULL,
  model_name VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS genre_predictions (
  song_id VARCHAR NOT NULL,
  predicted_genre VARCHAR NOT NULL,
  confidence DOUBLE NOT NULL
);

CREATE TABLE IF NOT EXISTS yearly_terms (
  year INTEGER NOT NULL,
  term VARCHAR NOT NULL,
  score DOUBLE NOT NULL,
  rank INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS similar_songs (
  song_id VARCHAR NOT NULL,
  similar_song_id VARCHAR NOT NULL,
  similarity_score DOUBLE NOT NULL,
  method VARCHAR NOT NULL
);
