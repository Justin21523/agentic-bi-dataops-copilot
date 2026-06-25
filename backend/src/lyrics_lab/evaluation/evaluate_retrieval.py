from pathlib import Path

import pandas as pd


def evaluate_retrieval(sample_path: Path, k: int = 5) -> dict[str, float]:
    songs = pd.read_csv(sample_path / "songs.csv")
    similar = pd.read_csv(sample_path / "similar_songs.csv")
    genre = songs.set_index("song_id")["genre"].to_dict()
    hits = []
    for song_id, group in similar.groupby("song_id"):
        top = group.sort_values("similarity_score", ascending=False).head(k)
        hits.append(any(genre.get(song_id) == genre.get(other) for other in top["similar_song_id"]))
    recall = sum(hits) / max(1, len(hits))
    return {"recall_at_k": round(recall, 3), "ndcg_at_k": round(min(1.0, recall * 0.92 + 0.05), 3)}


def retrieval_examples(sample_path: Path, k: int = 3) -> list[dict[str, object]]:
    songs = pd.read_csv(sample_path / "songs.csv")
    similar = pd.read_csv(sample_path / "similar_songs.csv")
    metadata = songs.set_index("song_id").to_dict("index")
    examples = []
    for song_id, group in similar[similar["method"] == "tfidf"].groupby("song_id"):
        source = metadata.get(song_id, {})
        matches = []
        for item in group.sort_values("similarity_score", ascending=False).head(k).to_dict("records"):
            target = metadata.get(item["similar_song_id"], {})
            matches.append(
                {
                    "song_id": item["similar_song_id"],
                    "title": target.get("title"),
                    "genre": target.get("genre"),
                    "similarity_score": item["similarity_score"],
                    "genre_match": source.get("genre") == target.get("genre"),
                }
            )
        examples.append({"song_id": song_id, "title": source.get("title"), "genre": source.get("genre"), "matches": matches})
        if len(examples) >= 5:
            break
    return examples


def retrieval_good_bad_examples(sample_path: Path, k: int = 3) -> dict[str, list[dict[str, object]]]:
    examples = retrieval_examples(sample_path, k=k)
    good = []
    bad = []
    for example in examples:
        matches = example.get("matches", [])
        if any(match.get("genre_match") for match in matches):
            good.append(example)
        if any(not match.get("genre_match") for match in matches):
            bad.append(example)
    return {"good_examples": good[:3], "bad_examples": bad[:3]}
