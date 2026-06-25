from __future__ import annotations

import argparse
import csv
import math
import random
from pathlib import Path

from lyrics_lab.utils.paths import sample_dir
from lyrics_lab.utils.serialization import dumps_json

TERMS_BY_GENRE = {
    "pop": ["heart", "dance", "night", "light", "dream", "city", "mirror", "summer", "radio", "shine"],
    "rock": ["fire", "road", "storm", "voice", "break", "drive", "guitar", "thunder", "rebel", "ashes"],
    "hip-hop": ["flow", "street", "rise", "beat", "truth", "power", "cipher", "block", "legacy", "hustle"],
    "folk": ["river", "home", "field", "memory", "wind", "story", "harbor", "train", "roots", "letter"],
    "electronic": ["pulse", "signal", "neon", "wave", "motion", "echo", "circuit", "bass", "chrome", "static"],
    "r-and-b": ["velvet", "touch", "slow", "room", "soul", "rain", "midnight", "warmth", "blue", "silence"],
    "latin": ["sol", "playa", "ritmo", "corazon", "fiesta", "calle", "luna", "beso", "mar", "vida"],
}
LANGUAGES = ["en", "zh", "es", "ja"]
COUNTRIES = ["US", "TW", "UK", "JP", "CA"]
MOODS = ["bright", "reflective", "intense", "melancholic", "confident"]
REGIONS_BY_COUNTRY = {"US": "North America", "CA": "North America", "UK": "Europe", "TW": "East Asia", "JP": "East Asia"}
LANGUAGE_FAMILY = {"en": "Germanic", "zh": "Sinitic", "es": "Romance", "ja": "Japonic"}
ERA_TERMS = {
    1990: ["radio", "train", "street", "memory"],
    2000: ["city", "signal", "drive", "legacy"],
    2010: ["neon", "pulse", "mirror", "rise"],
    2020: ["chrome", "static", "roots", "truth"],
}


def generate(output_dir: Path = sample_dir(), song_count: int = 300, seed: int = 7) -> None:
    rng = random.Random(seed)
    output_dir.mkdir(parents=True, exist_ok=True)
    artists = []
    songs = []
    bow = []
    sentiments = []
    embeddings = []

    for idx in range(36):
        start = rng.randint(1985, 2018)
        artists.append(
            {
                "artist_id": f"artist_{idx+1:03d}",
                "artist_name": f"Sample Artist {idx+1}",
                "country": rng.choice(COUNTRIES),
                "active_start_year": start,
                "active_end_year": "" if rng.random() > 0.7 else rng.randint(start + 3, 2025),
            }
        )
        artists[-1]["region"] = REGIONS_BY_COUNTRY[str(artists[-1]["country"])]

    for idx in range(song_count):
        artist = rng.choice(artists)
        genre = rng.choice(list(TERMS_BY_GENRE))
        year = rng.randint(max(1990, int(artist["active_start_year"])), 2025)
        song_id = f"song_{idx+1:04d}"
        songs.append(
            {
                "song_id": song_id,
                "title": f"Derived Feature Track {idx+1}",
                "artist_id": artist["artist_id"],
                "album": f"Feature Collection {1 + idx // 12}",
                "year": year,
                "decade": (year // 10) * 10,
                "language": rng.choice(LANGUAGES),
                "language_family": "",
                "genre": genre,
            }
        )
        songs[-1]["language_family"] = LANGUAGE_FAMILY[str(songs[-1]["language"])]

        decade = (year // 10) * 10
        era_terms = ERA_TERMS.get(decade, ERA_TERMS[2020])
        cross_genre_terms = [t for terms in TERMS_BY_GENRE.values() for t in terms if t not in TERMS_BY_GENRE[genre]]
        terms = TERMS_BY_GENRE[genre] + rng.sample(cross_genre_terms, 6) + rng.sample(era_terms, 2)
        for term in terms:
            base_weight = 1.1 if term in TERMS_BY_GENRE[genre] else 0.45
            era_boost = 0.5 if term in era_terms else 0.0
            bow.append({"song_id": song_id, "term": term, "weight": round(base_weight + era_boost + rng.uniform(0.05, 1.15), 4), "source": "generated_bow"})

        score = round(rng.uniform(-0.75, 0.85), 3)
        label = "positive" if score > 0.2 else "negative" if score < -0.2 else "neutral"
        sentiments.append({"song_id": song_id, "sentiment_score": score, "sentiment_label": label, "mood_tags": dumps_json(rng.sample(MOODS, 2))})

        base = list(TERMS_BY_GENRE).index(genre) / 5
        vector = [round(math.sin(base + i * 0.7 + idx * 0.03), 4) for i in range(8)]
        embeddings.append({"song_id": song_id, "embedding_json": dumps_json(vector), "model_name": "deterministic-style-v1"})

    write_csv(output_dir / "artists.csv", artists)
    write_csv(output_dir / "songs.csv", songs)
    write_csv(output_dir / "lyric_bow_features.csv", bow)
    write_csv(output_dir / "sentiment_scores.csv", sentiments)
    write_csv(output_dir / "style_embeddings.csv", embeddings)


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=sample_dir())
    parser.add_argument("--song-count", type=int, default=300)
    args = parser.parse_args()
    generate(args.output_dir, args.song_count)


if __name__ == "__main__":
    main()
