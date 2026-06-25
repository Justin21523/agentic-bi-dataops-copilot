from __future__ import annotations

import pandas as pd

from lyrics_lab.models.classification_pipeline import evaluate_pipeline, fit_full_demo_pipeline, predict_full_demo, split_documents


def train_genre_classifier(bow: pd.DataFrame, songs: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, float]]:
    split = split_documents(bow, songs, test_size=0.25)
    evaluation, _eval_pipeline = evaluate_pipeline("logistic_regression", "Logistic Regression", "classifier", split)
    demo_pipeline = fit_full_demo_pipeline(bow, songs, "logistic_regression")
    predictions = predict_full_demo(demo_pipeline, bow)
    metrics = {"accuracy": evaluation["accuracy"], "macro_f1": evaluation["macro_f1"]}
    return predictions, metrics


def predict_from_features(features: dict[str, float]) -> dict[str, object]:
    scores = {
        "pop": features.get("dance", 0) + features.get("light", 0),
        "rock": features.get("fire", 0) + features.get("storm", 0),
        "hip-hop": features.get("flow", 0) + features.get("beat", 0),
        "folk": features.get("home", 0) + features.get("river", 0),
        "electronic": features.get("pulse", 0) + features.get("neon", 0),
    }
    genre = max(scores, key=scores.get)
    total = sum(max(0.1, value) for value in scores.values())
    confidence = max(0.2, min(0.95, max(scores.values()) / total if total else 0.2))
    return {"predicted_genre": genre, "confidence": round(confidence, 3), "scores": scores}
