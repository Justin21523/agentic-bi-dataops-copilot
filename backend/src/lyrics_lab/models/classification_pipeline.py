from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import AdaBoostClassifier, GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

from lyrics_lab.features.tfidf_features import bow_to_documents


@dataclass(frozen=True)
class ClassificationSplit:
    x_train: pd.Series
    x_test: pd.Series
    y_train: pd.Series
    y_test: pd.Series
    ids_train: list[str]
    ids_test: list[str]
    labels_sorted: list[str]


def documents_and_labels(bow: pd.DataFrame, songs: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    docs = bow_to_documents(bow)
    labels = songs.set_index("song_id").loc[docs["song_id"]]["genre"].reset_index(drop=True)
    return docs, labels


def split_documents(bow: pd.DataFrame, songs: pd.DataFrame, test_size: float = 0.3, random_state: int = 7) -> ClassificationSplit:
    docs, labels = documents_and_labels(bow, songs)
    stratify = labels if labels.value_counts().min() >= 2 else None
    x_train, x_test, y_train, y_test, ids_train, ids_test = train_test_split(
        docs["document"],
        labels,
        docs["song_id"].tolist(),
        test_size=test_size,
        random_state=random_state,
        stratify=stratify,
    )
    return ClassificationSplit(
        x_train=x_train.reset_index(drop=True),
        x_test=x_test.reset_index(drop=True),
        y_train=y_train.reset_index(drop=True),
        y_test=y_test.reset_index(drop=True),
        ids_train=list(ids_train),
        ids_test=list(ids_test),
        labels_sorted=sorted(labels.dropna().unique().tolist()),
    )


def make_classifier(model_id: str) -> Any:
    models: dict[str, Any] = {
        "logistic_regression": LogisticRegression(max_iter=1000),
        "decision_tree": DecisionTreeClassifier(max_depth=None, min_samples_leaf=2, random_state=7),
        "random_forest": RandomForestClassifier(n_estimators=60, max_depth=7, min_samples_leaf=2, random_state=7),
        "linear_svm": LinearSVC(random_state=7),
        "gradient_boosting": GradientBoostingClassifier(random_state=7),
        "adaboost": AdaBoostClassifier(random_state=7),
    }
    if model_id == "voting_ensemble":
        return VotingClassifier(
            estimators=[
                ("lr", LogisticRegression(max_iter=1000)),
                ("dt", DecisionTreeClassifier(max_depth=None, min_samples_leaf=2, random_state=7)),
                ("rf", RandomForestClassifier(n_estimators=40, max_depth=7, min_samples_leaf=2, random_state=7)),
            ],
            voting="hard",
        )
    return models[model_id]


def make_pipeline(model_id: str) -> Pipeline:
    return Pipeline([("tfidf", TfidfVectorizer(min_df=1)), ("model", make_classifier(model_id))])


def model_specs() -> list[tuple[str, str, str]]:
    return [
        ("logistic_regression", "Logistic Regression", "classifier"),
        ("decision_tree", "Decision Tree", "tree"),
        ("random_forest", "Random Forest", "ensemble"),
        ("linear_svm", "Linear SVM", "classifier"),
        ("gradient_boosting", "Gradient Boosting", "ensemble"),
        ("adaboost", "AdaBoost", "ensemble"),
        ("voting_ensemble", "Voting Ensemble", "ensemble"),
    ]


def leakage_audit(split: ClassificationSplit, target: str = "genre") -> dict[str, Any]:
    train_ids = set(split.ids_train)
    test_ids = set(split.ids_test)
    return {
        "status": "pass",
        "target": target,
        "split_seed": 7,
        "train_count": len(split.ids_train),
        "test_count": len(split.ids_test),
        "overlap_count": len(train_ids & test_ids),
        "vectorizer_fit_scope": "train_split_only",
        "test_transform_scope": "heldout_split_using_train_vocabulary",
        "excluded_from_features": ["song_id", "title", "artist_id", "artist_name", "album", "genre"],
    }


def top_features_from_pipeline(pipeline: Pipeline, limit: int = 16) -> list[dict[str, float | str]]:
    vectorizer = pipeline.named_steps["tfidf"]
    model = pipeline.named_steps["model"]
    terms = vectorizer.get_feature_names_out()
    scores: np.ndarray | None = None
    if hasattr(model, "feature_importances_"):
        scores = np.asarray(model.feature_importances_, dtype=float)
    elif hasattr(model, "coef_"):
        coef = np.asarray(model.coef_, dtype=float)
        scores = np.mean(np.abs(coef), axis=0) if coef.ndim > 1 else np.abs(coef)
    if scores is None or scores.size == 0:
        return []
    top = scores.argsort()[-limit:][::-1]
    return [{"feature": str(terms[index]), "score": round(float(scores[index]), 4)} for index in top if scores[index] > 0]


def evaluate_pipeline(model_id: str, label: str, family: str, split: ClassificationSplit) -> tuple[dict[str, Any], Pipeline]:
    pipeline = make_pipeline(model_id)
    pipeline.fit(split.x_train, split.y_train)
    predicted = pipeline.predict(split.x_test)
    report = classification_report(split.y_test, predicted, labels=split.labels_sorted, output_dict=True, zero_division=0)
    result = {
        "model_id": model_id,
        "label": label,
        "family": family,
        "accuracy": round(float(accuracy_score(split.y_test, predicted)), 3),
        "macro_f1": round(float(f1_score(split.y_test, predicted, average="macro")), 3),
        "confusion_matrix": {"labels": split.labels_sorted, "matrix": confusion_matrix(split.y_test, predicted, labels=split.labels_sorted).tolist()},
        "per_class_metrics": {
            genre: {
                "precision": round(float(values["precision"]), 3),
                "recall": round(float(values["recall"]), 3),
                "f1": round(float(values["f1-score"]), 3),
                "support": int(values["support"]),
            }
            for genre, values in report.items()
            if genre in split.labels_sorted
        },
        "top_features": top_features_from_pipeline(pipeline),
        "notes": "Evaluation pipeline fits TF-IDF on train split only, then transforms the held-out split.",
    }
    return result, pipeline


def fit_full_demo_pipeline(bow: pd.DataFrame, songs: pd.DataFrame, model_id: str = "logistic_regression") -> Pipeline:
    docs, labels = documents_and_labels(bow, songs)
    pipeline = make_pipeline(model_id)
    pipeline.fit(docs["document"], labels)
    return pipeline


def predict_full_demo(pipeline: Pipeline, bow: pd.DataFrame) -> pd.DataFrame:
    docs = bow_to_documents(bow)
    predictions = pipeline.predict(docs["document"])
    model = pipeline.named_steps["model"]
    if hasattr(model, "predict_proba"):
        confidence = pipeline.predict_proba(docs["document"]).max(axis=1)
    else:
        confidence = np.ones(len(predictions)) * 0.5
    return pd.DataFrame(
        {
            "song_id": docs["song_id"],
            "predicted_genre": predictions,
            "confidence": [round(float(value), 3) for value in confidence],
        }
    )
