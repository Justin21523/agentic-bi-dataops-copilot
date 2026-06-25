from pathlib import Path

import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score

from lyrics_lab.models.genre_classifier import train_genre_classifier
from lyrics_lab.models.classification_pipeline import evaluate_pipeline, leakage_audit, split_documents


def evaluate_classifier(sample_path: Path) -> dict[str, float]:
    bow = pd.read_csv(sample_path / "lyric_bow_features.csv")
    songs = pd.read_csv(sample_path / "songs.csv")
    _predictions, metrics = train_genre_classifier(bow, songs)
    return metrics


def classifier_details(sample_path: Path) -> dict[str, object]:
    bow = pd.read_csv(sample_path / "lyric_bow_features.csv")
    songs = pd.read_csv(sample_path / "songs.csv")
    split = split_documents(bow, songs, test_size=0.25)
    result, pipeline = evaluate_pipeline("logistic_regression", "Logistic Regression", "classifier", split)
    baseline = DummyClassifier(strategy="most_frequent")
    train_vectors = pipeline.named_steps["tfidf"].transform(split.x_train)
    test_vectors = pipeline.named_steps["tfidf"].transform(split.x_test)
    baseline.fit(train_vectors, split.y_train)
    baseline_predicted = baseline.predict(test_vectors)
    baseline_accuracy = float(accuracy_score(split.y_test, baseline_predicted))
    tfidf_accuracy = float(result["accuracy"])
    return {
        "majority_baseline_accuracy": round(baseline_accuracy, 3),
        "tfidf_accuracy": round(tfidf_accuracy, 3),
        "accuracy_lift": round(tfidf_accuracy - baseline_accuracy, 3),
        "confusion_matrix": result["confusion_matrix"],
        "per_genre_metrics": result["per_class_metrics"],
        "leakage_audit": leakage_audit(split),
    }
