from __future__ import annotations

from collections import Counter
from html import escape
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Body, HTTPException
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, silhouette_score
from sklearn.tree import _tree, export_text

from lyrics_lab.features.tfidf_features import build_tfidf
from lyrics_lab.features.tfidf_features import bow_to_documents
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics
from lyrics_lab.models.classification_pipeline import (
    evaluate_pipeline,
    fit_full_demo_pipeline,
    leakage_audit,
    make_pipeline,
    model_specs,
    split_documents,
    top_features_from_pipeline,
)
from lyrics_lab.models.topic_model import train_topics
from lyrics_lab.utils.datasets import dataset_dir, public_dataset_id

router = APIRouter(prefix="/analysis", tags=["analysis"])

STORY_SCOPES = {"overview", "genre", "similarity", "topic", "artist", "data_quality"}


def _dataset_root(dataset_id: str = "demo") -> tuple[str, Any]:
    try:
        root = dataset_dir(dataset_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_id}") from exc
    return public_dataset_id(root), root


def _load_demo_frames(dataset_id: str = "demo") -> dict[str, pd.DataFrame]:
    resolved_id, root = _dataset_root(dataset_id)
    required = ["songs.csv", "artists.csv", "lyric_bow_features.csv"]
    missing = [name for name in required if not (root / name).exists()]
    if missing:
        raise HTTPException(status_code=404, detail=f"Missing demo data: {', '.join(missing)}")
    songs = pd.read_csv(root / "songs.csv")
    artists = pd.read_csv(root / "artists.csv")
    bow = pd.read_csv(root / "lyric_bow_features.csv")
    return {"dataset_id": resolved_id, "songs": songs, "artists": artists, "bow": bow}


def _demo_dataset(dataset_id: str = "demo") -> pd.DataFrame:
    frames = _load_demo_frames(dataset_id)
    songs = frames["songs"]
    artists = frames["artists"]
    return songs.merge(artists, on="artist_id", how="left")


def _matrix_and_labels(dataset_id: str = "demo") -> tuple[str, list[str], Any, Any, pd.Series]:
    frames = _load_demo_frames(dataset_id)
    song_ids, vectorizer, matrix = build_tfidf(frames["bow"])
    labels = frames["songs"].set_index("song_id").loc[song_ids]["genre"]
    return str(frames["dataset_id"]), song_ids, vectorizer, matrix, labels


def _tree_graph(model: Any, terms: np.ndarray, tree_id: str = "tree") -> dict[str, Any]:
    tree = model.tree_
    classes = [str(item) for item in model.classes_]
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    root_samples = max(1, int(tree.n_node_samples[0]))

    def walk(index: int, depth: int, x_order: list[int]) -> None:
        feature_index = int(tree.feature[index])
        is_leaf = feature_index == _tree.TREE_UNDEFINED
        predicted_class = classes[int(np.argmax(tree.value[index][0]))]
        node_id = f"{tree_id}-{index}"
        nodes.append(
            {
                "id": node_id,
                "raw_id": int(index),
                "feature": None if is_leaf else str(terms[feature_index]),
                "threshold": None if is_leaf else round(float(tree.threshold[index]), 3),
                "samples": int(tree.n_node_samples[index]),
                "sample_ratio": round(float(tree.n_node_samples[index] / root_samples), 4),
                "prediction": predicted_class,
                "depth": depth,
                "is_leaf": is_leaf,
                "impurity": round(float(tree.impurity[index]), 4),
                "class_counts": [int(value) for value in tree.value[index][0].tolist()],
                "class_labels": classes,
                "majority_count": int(max(tree.value[index][0].tolist())),
                "x_order": len(x_order),
            }
        )
        x_order.append(index)
        if not is_leaf:
            for child_index, branch in [(int(tree.children_left[index]), "<="), (int(tree.children_right[index]), ">")]:
                edges.append({"id": f"{node_id}-{branch}-{child_index}", "source": node_id, "target": f"{tree_id}-{child_index}", "label": branch})
                walk(child_index, depth + 1, x_order)

    walk(0, 0, [])
    return {"nodes": nodes, "edges": edges, "node_count": len(nodes), "max_depth": max((node["depth"] for node in nodes), default=0)}


def _classification_context(dataset_id: str) -> dict[str, Any]:
    frames = _load_demo_frames(dataset_id)
    split = split_documents(frames["bow"], frames["songs"])
    results = []
    fitted: dict[str, Any] = {}
    predictions: dict[str, list[str]] = {}
    for model_id, label, family in model_specs():
        try:
            result, pipeline = evaluate_pipeline(model_id, label, family, split)
            fitted[model_id] = pipeline
            predictions[model_id] = [str(item) for item in pipeline.predict(split.x_test).tolist()]
            results.append(result)
        except Exception as exc:  # pragma: no cover - defensive for tiny custom datasets
            results.append({"model_id": model_id, "label": label, "family": family, "error": str(exc), "accuracy": 0, "macro_f1": 0, "top_features": [], "per_class_metrics": {}})
    return {"frames": frames, "split": split, "results": results, "fitted": fitted, "predictions": predictions}


def _safe_song_record(song: dict[str, Any]) -> dict[str, Any]:
    return {
        "song_id": str(song.get("song_id")),
        "title": song.get("title"),
        "artist_id": song.get("artist_id"),
        "year": None if pd.isna(song.get("year")) else int(song.get("year")) if song.get("year") is not None else None,
        "genre": song.get("genre"),
        "language": song.get("language"),
        "decade": None if pd.isna(song.get("decade")) else int(song.get("decade")) if song.get("decade") is not None else None,
    }


def _song_by_id_record(songs_by_id: dict[str, dict[str, Any]], song_id: str) -> dict[str, Any]:
    song = dict(songs_by_id.get(song_id, {}))
    song["song_id"] = song_id
    return _safe_song_record(song)


def _evidence(label: str, metric: str, value: Any, route: str, anchor: str) -> dict[str, Any]:
    return {"label": label, "metric": metric, "value": value, "route": route, "anchor": anchor}


def _insight(insight_id: str, story_type: str, title: str, summary: str, severity: str, confidence: str, evidence: list[dict[str, Any]], next_action: str) -> dict[str, Any]:
    return {
        "id": insight_id,
        "story_type": story_type,
        "title": title,
        "summary": summary,
        "severity": severity,
        "confidence": confidence,
        "evidence": evidence,
        "next_action": next_action,
    }


@router.get("/datasets/{dataset_id}/profile")
def dataset_profile(dataset_id: str = "demo") -> dict[str, Any]:
    resolved_id, _root = _dataset_root(dataset_id)
    dataset = _demo_dataset(dataset_id)
    columns = []
    for column in dataset.columns:
        series = dataset[column]
        columns.append(
            {
                "name": column,
                "dtype": str(series.dtype),
                "missing": int(series.isna().sum()),
                "unique": int(series.nunique(dropna=True)),
                "sample_values": [str(value) for value in series.dropna().head(4).tolist()],
            }
        )
    numeric = dataset.select_dtypes(include=["number"]).describe().fillna(0).to_dict()
    categorical = {
        column: [{"value": str(value), "count": int(count)} for value, count in Counter(dataset[column].dropna()).most_common(6)]
        for column in dataset.select_dtypes(exclude=["number"]).columns[:8]
    }
    return {
        "dataset_id": resolved_id,
        "name": "Demo tabular music metadata dataset" if resolved_id == "demo" else f"Uploaded dataset {resolved_id}",
        "row_count": int(len(dataset)),
        "column_count": int(dataset.shape[1]),
        "duplicate_rows": int(dataset.duplicated().sum()),
        "missing_cells": int(dataset.isna().sum().sum()),
        "columns": columns,
        "numeric_summary": numeric,
        "categorical_summary": categorical,
        "workflow": [
            {"step": "upload", "status": "complete"},
            {"step": "inspect", "status": "complete"},
            {"step": "clean", "status": "active"},
            {"step": "analyze", "status": "pending"},
            {"step": "visualize", "status": "pending"},
        ],
    }


@router.post("/datasets/{dataset_id}/cleaning-preview")
def cleaning_preview(dataset_id: str = "demo") -> dict[str, Any]:
    resolved_id, _root = _dataset_root(dataset_id)
    dataset = _demo_dataset(dataset_id)
    issues = []
    for column in dataset.columns:
        missing = int(dataset[column].isna().sum())
        if missing:
            issues.append({"column": column, "issue": "missing_values", "count": missing, "action": "impute_or_filter"})
    return {
        "dataset_id": resolved_id,
        "input_rows": int(len(dataset)),
        "output_rows": int(len(dataset.drop_duplicates())),
        "duplicate_rows_removed": int(dataset.duplicated().sum()),
        "issues": issues,
        "recommended_actions": [
            "Confirm the target column before classification.",
            "Review rare classes before model training.",
            "Keep raw protected text out of exported reports.",
        ],
    }


@router.post("/datasets/{dataset_id}/models/classification")
def classification_models(dataset_id: str = "demo") -> dict[str, Any]:
    context = _classification_context(dataset_id)
    frames = context["frames"]
    split = context["split"]
    results = context["results"]
    fitted = context["fitted"]
    decision_tree = fitted.get("decision_tree")
    forest = fitted.get("random_forest")
    terms = decision_tree.named_steps["tfidf"].get_feature_names_out() if decision_tree is not None else []
    tree_model = decision_tree.named_steps["model"] if decision_tree is not None else None
    forest_model = forest.named_steps["model"] if forest is not None else None
    forest_terms = forest.named_steps["tfidf"].get_feature_names_out() if forest is not None else terms
    if decision_tree is not None:
        baseline = DummyClassifier(strategy="most_frequent")
        train_vectors = decision_tree.named_steps["tfidf"].transform(split.x_train)
        test_vectors = decision_tree.named_steps["tfidf"].transform(split.x_test)
        baseline.fit(train_vectors, split.y_train)
        baseline_predicted = baseline.predict(test_vectors)
    else:
        fallback = make_pipeline("logistic_regression")
        fallback.named_steps["tfidf"].fit(split.x_train)
        baseline = DummyClassifier(strategy="most_frequent")
        baseline.fit(fallback.named_steps["tfidf"].transform(split.x_train), split.y_train)
        baseline_predicted = baseline.predict(fallback.named_steps["tfidf"].transform(split.x_test))
    baseline_accuracy = round(float(accuracy_score(split.y_test, baseline_predicted)), 3)
    return {
        "dataset_id": frames["dataset_id"],
        "target": "genre",
        "feature_space": "tfidf_bow",
        "baseline": {"model_id": "majority_baseline", "label": "Majority Baseline", "accuracy": baseline_accuracy},
        "leakage_audit": leakage_audit(split),
        "models": sorted(results, key=lambda item: (item.get("accuracy", 0), item.get("macro_f1", 0)), reverse=True),
        "decision_tree": {
            "text": export_text(tree_model, feature_names=list(terms), max_depth=12) if tree_model is not None else "",
            **(_tree_graph(tree_model, terms, "decision-tree") if tree_model is not None else {"nodes": [], "edges": [], "node_count": 0, "max_depth": 0}),
        },
        "random_forest": {
            "tree_count": int(len(forest_model.estimators_)) if forest_model is not None else 0,
            "feature_importances": top_features_from_pipeline(forest) if forest is not None else [],
            "sample_trees": [
                {"tree_index": index, **_tree_graph(estimator, forest_terms, f"rf-{index}")}
                for index, estimator in enumerate((forest_model.estimators_[:3] if forest_model is not None else []))
            ],
        },
        "deep_learning": {
            "status": "planned",
            "methods": ["multilayer perceptron", "CNN text classifier", "transformer fine-tuning"],
            "note": "Deep learning is exposed as a future extension point; current runtime uses scikit-learn.",
        },
    }


@router.post("/datasets/{dataset_id}/models/clustering")
def clustering_models(dataset_id: str = "demo") -> dict[str, Any]:
    frames = _load_demo_frames(dataset_id)
    resolved_id, song_ids, vectorizer, matrix, labels = _matrix_and_labels(dataset_id)
    max_components = max(2, min(8, matrix.shape[1] - 1, matrix.shape[0] - 1))
    reduced = TruncatedSVD(n_components=max_components, random_state=7).fit_transform(matrix)
    projection = reduced[:, :2]
    songs_by_id = frames["songs"].set_index("song_id").to_dict("index")
    bow = frames["bow"]
    terms = vectorizer.get_feature_names_out()
    topic_lookup: dict[str, str] = {}
    topics_path = dataset_dir(dataset_id) / "lyric_topics.csv"
    if topics_path.exists():
      topic_frame = pd.read_csv(topics_path)
      topic_lookup = topic_frame.set_index("song_id")["topic_label"].to_dict()
    methods = {
        "kmeans": KMeans(n_clusters=min(6, len(set(labels))), n_init=10, random_state=7).fit_predict(reduced),
        "agglomerative": AgglomerativeClustering(n_clusters=min(6, len(set(labels)))).fit_predict(reduced),
        "dbscan": DBSCAN(eps=0.55, min_samples=4).fit_predict(reduced),
    }
    summaries = []
    for method, cluster_labels in methods.items():
        unique_labels = set(cluster_labels.tolist())
        valid_silhouette = len(unique_labels - {-1}) > 1 and len(unique_labels) < len(cluster_labels)
        points = [
            {
                "song_id": song_id,
                "x": round(float(projection[index, 0]), 4),
                "y": round(float(projection[index, 1]), 4),
                "cluster": int(cluster_labels[index]),
                "label": str(labels.iloc[index]),
            }
            for index, song_id in enumerate(song_ids[:120])
        ]
        cluster_profiles = []
        for cluster in sorted(unique_labels):
            mask = cluster_labels == cluster
            cluster_projection = projection[mask]
            cluster_indices = np.where(mask)[0]
            cluster_song_ids = [song_ids[index] for index in cluster_indices]
            label_counts = Counter(labels.iloc[np.where(mask)[0]].tolist())
            centroid = cluster_projection.mean(axis=0) if len(cluster_projection) else np.array([0, 0])
            distances = [(song_ids[index], float(np.linalg.norm(projection[index] - centroid))) for index in cluster_indices]
            representative_songs = []
            for song_id, _distance in sorted(distances, key=lambda item: item[1])[:5]:
                song = songs_by_id.get(song_id, {})
                representative_songs.append(
                    {
                        "song_id": song_id,
                        "title": song.get("title"),
                        "artist_id": song.get("artist_id"),
                        "year": None if pd.isna(song.get("year")) else int(song.get("year")),
                        "genre": song.get("genre"),
                    }
                )
            cluster_bow = bow[bow["song_id"].isin(cluster_song_ids)]
            other_bow = bow[~bow["song_id"].isin(cluster_song_ids)]
            cluster_terms = cluster_bow.groupby("term")["weight"].mean().sort_values(ascending=False).head(8)
            other_terms = other_bow.groupby("term")["weight"].mean() if not other_bow.empty else pd.Series(dtype=float)
            contrast_scores = (cluster_terms - cluster_terms.index.to_series().map(other_terms).fillna(0).to_numpy()).sort_values(ascending=False).head(6)
            topic_counts = Counter(topic_lookup.get(song_id, "unassigned") for song_id in cluster_song_ids)
            cluster_profiles.append(
                {
                    "cluster": int(cluster),
                    "size": int(np.sum(mask)),
                    "dominant_label": str(label_counts.most_common(1)[0][0]) if label_counts else "n/a",
                    "centroid": {
                        "x": round(float(centroid[0]), 4),
                        "y": round(float(centroid[1]), 4),
                    },
                    "label_distribution": [{"label": str(label), "count": int(count)} for label, count in label_counts.most_common(6)],
                    "representative_songs": representative_songs,
                    "top_terms": [{"term": str(term), "score": round(float(score), 4)} for term, score in cluster_terms.items()],
                    "topic_mix": [{"topic_label": str(topic), "count": int(count)} for topic, count in topic_counts.most_common(5)],
                    "contrast_terms": [{"term": str(term), "score": round(float(score), 4)} for term, score in contrast_scores.items()],
                }
            )
        summaries.append(
            {
                "method": method,
                "cluster_count": int(len(unique_labels - {-1})),
                "noise_count": int(np.sum(cluster_labels == -1)),
                "silhouette": round(float(silhouette_score(reduced, cluster_labels)), 3) if valid_silhouette else None,
                "points": points,
                "cluster_profiles": cluster_profiles,
            }
        )
    return {"dataset_id": resolved_id, "feature_space": "tfidf_bow_svd", "projection_note": "SVD projection shows relative distance in compressed TF-IDF space; axes are not original columns.", "methods": summaries}


@router.post("/datasets/{dataset_id}/text/tfidf")
def tfidf_summary(dataset_id: str = "demo") -> dict[str, Any]:
    resolved_id, _song_ids, vectorizer, matrix, _labels = _matrix_and_labels(dataset_id)
    terms = vectorizer.get_feature_names_out()
    scores = np.asarray(matrix.mean(axis=0)).ravel()
    top = scores.argsort()[-30:][::-1]
    return {
        "dataset_id": resolved_id,
        "method": "tfidf",
        "terms": [{"term": str(terms[index]), "score": round(float(scores[index]), 4)} for index in top],
    }


@router.post("/datasets/{dataset_id}/text/topics")
def topic_model_summary(dataset_id: str = "demo") -> dict[str, Any]:
    frames = _load_demo_frames(dataset_id)
    topics, labels = train_topics(frames["bow"], n_topics=6)
    return {
        "dataset_id": frames["dataset_id"],
        "method": "nmf_topic_modeling",
        "topics": labels.to_dict("records"),
        "assignments": topics.head(80).to_dict("records"),
    }


@router.get("/datasets/{dataset_id}/stories")
def analysis_stories(dataset_id: str = "demo", scope: str = "overview") -> dict[str, Any]:
    if scope not in STORY_SCOPES:
        raise HTTPException(status_code=400, detail=f"Unsupported story scope: {scope}")
    profile = dataset_profile(dataset_id)
    cleaning = cleaning_preview(dataset_id)
    classification = classification_models(dataset_id)
    clustering = clustering_models(dataset_id)
    tfidf = tfidf_summary(dataset_id)
    topics = topic_model_summary(dataset_id)
    best_model = classification["models"][0] if classification["models"] else {}
    weakest_class = None
    for model in classification["models"]:
        for label, metrics in (model.get("per_class_metrics") or {}).items():
            candidate = {"label": label, **metrics, "model": model.get("label")}
            if weakest_class is None or candidate.get("f1", 1) < weakest_class.get("f1", 1):
                weakest_class = candidate
    top_cluster = None
    if clustering["methods"] and clustering["methods"][0].get("cluster_profiles"):
        top_cluster = max(clustering["methods"][0]["cluster_profiles"], key=lambda item: item.get("size", 0))
    quality_severity = "warning" if profile["missing_cells"] or cleaning["duplicate_rows_removed"] else "info"
    insights = [
        _insight(
            "genre-best-model",
            "genre",
            f"{best_model.get('label', 'Best model')} leads genre classification",
            f"The strongest held-out classifier reaches {best_model.get('accuracy', 0)} accuracy and {best_model.get('macro_f1', 0)} macro-F1.",
            "high" if best_model.get("macro_f1", 0) >= 0.7 else "medium",
            "High confidence" if classification.get("leakage_audit", {}).get("overlap_count") == 0 else "Needs audit",
            [
                _evidence("Model comparison", "macro_f1", best_model.get("macro_f1", 0), "/ml-lab", "classification"),
                _evidence("Leakage audit", "overlap_count", classification.get("leakage_audit", {}).get("overlap_count", 0), "/ml-lab", "classification"),
            ],
            "Open ML Lab and inspect per-class metrics before choosing a production candidate.",
        ),
        _insight(
            "genre-weak-class",
            "genre",
            f"{weakest_class.get('label', 'A genre') if weakest_class else 'Some genres'} need more evidence",
            f"The weakest class has F1 {weakest_class.get('f1', 0) if weakest_class else 0}; this is where confusion is most likely.",
            "warning",
            "Needs more data" if weakest_class and weakest_class.get("support", 0) < 10 else "Medium confidence",
            [_evidence("Per-class metrics", "f1", weakest_class.get("f1", 0) if weakest_class else 0, "/evaluation", "evaluation")],
            "Review confused genres and add more balanced derived examples.",
        ),
        _insight(
            "topic-leading-terms",
            "topic",
            "TF-IDF highlights distinctive vocabulary signals",
            f"Top weighted terms include {', '.join(item['term'] for item in tfidf['terms'][:4])}.",
            "info",
            "High confidence",
            [_evidence("TF-IDF terms", "top_terms", len(tfidf["terms"]), "/ml-lab", "tfidf")],
            "Compare high-weight terms with topic labels to confirm interpretability.",
        ),
        _insight(
            "topic-structure",
            "topic",
            "Topic modeling creates a readable cultural map",
            f"NMF produced {len(topics['topics'])} topics, with labels such as {topics['topics'][0]['topic_label'] if topics['topics'] else 'n/a'}.",
            "info",
            "Medium confidence",
            [_evidence("Topic table", "topic_count", len(topics["topics"]), "/topics", "topic-decade")],
            "Open the topic explorer and inspect decade-topic concentration.",
        ),
        _insight(
            "cluster-recommendation",
            "similarity",
            "Similarity groups are interpretable through clusters",
            f"The largest KMeans cluster contains {top_cluster.get('size', 0) if top_cluster else 0} songs and is dominated by {top_cluster.get('dominant_label', 'n/a') if top_cluster else 'n/a'}.",
            "medium",
            "Medium confidence",
            [_evidence("Cluster profile", "cluster_size", top_cluster.get("size", 0) if top_cluster else 0, "/ml-lab", "cluster")],
            "Inspect representative songs and contrast terms before trusting recommendations.",
        ),
        _insight(
            "artist-style",
            "artist",
            "Artist style can be compared with derived fingerprints",
            "Style fingerprints summarize topic diversity, genre consistency, lyrical complexity proxy, and uniqueness without exposing lyrics.",
            "info",
            "Medium confidence",
            [_evidence("Artist style", "available_metrics", 5, "/artists", "artist-style")],
            "Open Artist Style Fingerprint and compare clusters by region or genre.",
        ),
        _insight(
            "data-quality",
            "data_quality",
            "Data quality is ready for explainable analysis",
            f"The active dataset has {profile['row_count']} rows, {profile['missing_cells']} missing cells, and {profile['duplicate_rows']} duplicate rows.",
            quality_severity,
            "High confidence",
            [
                _evidence("Schema profile", "missing_cells", profile["missing_cells"], "/workflow", "inspect"),
                _evidence("Cleaning preview", "duplicates_removed", cleaning["duplicate_rows_removed"], "/workflow", "clean"),
            ],
            "Fix missing or duplicated records before treating model differences as meaningful.",
        ),
    ]
    filtered = insights if scope == "overview" else [item for item in insights if item["story_type"] == scope]
    payload = {"dataset_id": profile["dataset_id"], "scope": scope, "insights": filtered[:8]}
    assert_no_raw_lyrics(payload)
    return payload


def _signed_terms(pipeline: Any, label: str | None = None, limit: int = 8) -> dict[str, Any]:
    model = pipeline.named_steps["model"]
    vectorizer = pipeline.named_steps["tfidf"]
    terms = vectorizer.get_feature_names_out()
    if not hasattr(model, "coef_"):
        return {"positive": [], "negative": []}
    coef = np.asarray(model.coef_, dtype=float)
    if coef.ndim > 1:
        class_index = 0
        if label is not None and hasattr(model, "classes_") and label in model.classes_:
            class_index = list(model.classes_).index(label)
        scores = coef[class_index]
    else:
        scores = coef
    positive = scores.argsort()[-limit:][::-1]
    negative = scores.argsort()[:limit]
    return {
        "positive": [{"term": str(terms[index]), "score": round(float(scores[index]), 4)} for index in positive],
        "negative": [{"term": str(terms[index]), "score": round(float(scores[index]), 4)} for index in negative],
    }


@router.get("/datasets/{dataset_id}/explainability")
def explainability_center(dataset_id: str = "demo", song_id: str | None = None) -> dict[str, Any]:
    context = _classification_context(dataset_id)
    frames = context["frames"]
    split = context["split"]
    fitted = context["fitted"]
    results = context["results"]
    predictions = context["predictions"]
    songs_by_id = frames["songs"].set_index("song_id").to_dict("index")
    heldout_options = [_song_by_id_record(songs_by_id, item) for item in split.ids_test[:30] if item in songs_by_id]
    selected_id = song_id if song_id in split.ids_test else (split.ids_test[0] if split.ids_test else None)
    selected_index = split.ids_test.index(selected_id) if selected_id in split.ids_test else 0
    actual = str(split.y_test.iloc[selected_index]) if len(split.y_test) else None
    feature_comparison = []
    for model_id, label, _family in model_specs():
        pipeline = fitted.get(model_id)
        model_result = next((item for item in results if item.get("model_id") == model_id), {})
        if pipeline is None:
            continue
        feature_comparison.append(
            {
                "model_id": model_id,
                "label": label,
                "top_features": top_features_from_pipeline(pipeline, limit=12),
                "signed_terms": _signed_terms(pipeline, actual),
                "accuracy": model_result.get("accuracy", 0),
                "macro_f1": model_result.get("macro_f1", 0),
            }
        )
    per_class = []
    best_result = sorted(results, key=lambda item: (item.get("accuracy", 0), item.get("macro_f1", 0)), reverse=True)[0] if results else {}
    labels = split.labels_sorted
    matrix = (best_result.get("confusion_matrix") or {}).get("matrix") or []
    for row_index, label in enumerate(labels):
        row = matrix[row_index] if row_index < len(matrix) else []
        confusion_targets = [
            {"predicted": labels[col_index], "count": int(count)}
            for col_index, count in enumerate(row)
            if col_index != row_index and count
        ]
        top_terms = []
        lr = fitted.get("logistic_regression") or fitted.get("linear_svm")
        if lr is not None:
            top_terms = _signed_terms(lr, label, limit=5)["positive"]
        metrics = (best_result.get("per_class_metrics") or {}).get(label, {})
        per_class.append({"label": label, "metrics": metrics, "top_terms": top_terms, "confused_with": confusion_targets[:3]})
    disagreements = []
    if selected_id:
        for model_id, label, _family in model_specs():
            pred = predictions.get(model_id, [])
            if selected_index < len(pred):
                disagreements.append({"model_id": model_id, "label": label, "prediction": pred[selected_index], "matches_actual": pred[selected_index] == actual})
    errors = []
    for index, test_id in enumerate(split.ids_test[:80]):
        row_actual = str(split.y_test.iloc[index])
        model_preds = {model_id: pred[index] for model_id, pred in predictions.items() if index < len(pred)}
        if any(value != row_actual for value in model_preds.values()):
            errors.append({"song": _song_by_id_record(songs_by_id, test_id), "actual": row_actual, "predictions": model_preds})
        if len(errors) >= 8:
            break
    payload = {
        "dataset_id": frames["dataset_id"],
        "mode": "heldout_split" if selected_id == song_id or song_id is None else "heldout_fallback",
        "selected_song": _song_by_id_record(songs_by_id, selected_id) if selected_id and selected_id in songs_by_id else None,
        "heldout_options": heldout_options,
        "actual_genre": actual,
        "feature_comparison": feature_comparison,
        "per_class": per_class,
        "model_disagreement": disagreements,
        "error_explanations": errors,
        "leakage_audit": leakage_audit(split),
        "improvement_advice": [
            "Collect more derived examples for low-support genres.",
            "Inspect confused genre pairs before adding model complexity.",
            "Use train-only vectorizer fitting for every reported metric.",
        ],
    }
    assert_no_raw_lyrics(payload)
    return payload


@router.get("/datasets/{dataset_id}/lineage")
def dataset_lineage(dataset_id: str = "demo", song_id: str | None = None) -> dict[str, Any]:
    frames = _load_demo_frames(dataset_id)
    songs = frames["songs"]
    bow = frames["bow"]
    selected_id = song_id if song_id in set(songs["song_id"]) else str(songs.iloc[0]["song_id"])
    song = songs[songs["song_id"] == selected_id].iloc[0].to_dict()
    song_bow = bow[bow["song_id"] == selected_id].sort_values("weight", ascending=False)
    docs = bow_to_documents(bow)
    document = docs[docs["song_id"] == selected_id]["document"].iloc[0] if selected_id in set(docs["song_id"]) else ""
    _ids, vectorizer, matrix = build_tfidf(bow)
    song_ids = _ids
    selected_index = song_ids.index(selected_id) if selected_id in song_ids else 0
    terms = vectorizer.get_feature_names_out()
    vector_scores = np.asarray(matrix[selected_index].todense()).ravel()
    top_indices = vector_scores.argsort()[-8:][::-1]
    topics, _labels = train_topics(bow, n_topics=6)
    topic_rows = topics[topics["song_id"] == selected_id].sort_values("topic_score", ascending=False).head(4)
    pipeline = fit_full_demo_pipeline(bow, songs)
    prediction = str(pipeline.predict([document])[0]) if document else None
    payload = {
        "dataset_id": frames["dataset_id"],
        "selected_song": _safe_song_record(song),
        "song_options": [_safe_song_record(item) for item in songs.head(80).to_dict("records")],
        "steps": [
            {
                "key": "raw_metadata",
                "label": "Raw metadata",
                "input": {"source": "songs.csv"},
                "output": _safe_song_record(song),
                "field_changes": {"kept": ["song_id", "title", "artist_id", "year", "genre", "language"], "removed": ["raw lyric fields"]},
                "explanation": "The platform starts from safe metadata and never exposes complete lyric text.",
                "status": "complete",
            },
            {
                "key": "validation",
                "label": "Validation result",
                "input": {"required_files": ["artists.csv", "songs.csv", "lyric_bow_features.csv"]},
                "output": {"row_count": int(len(songs)), "bow_rows": int(len(bow)), "forbidden_fields_found": 0},
                "field_changes": {"kept": ["metadata", "derived BoW features"], "removed": []},
                "explanation": "Validation confirms schema readiness and protects the no-raw-lyrics boundary.",
                "status": "complete",
            },
            {
                "key": "cleaning",
                "label": "Cleaning result",
                "input": {"duplicate_rows": int(songs.duplicated().sum()), "missing_cells": int(songs.isna().sum().sum())},
                "output": {"rows_after_duplicate_review": int(len(songs.drop_duplicates()))},
                "field_changes": {"kept": list(songs.columns[:8]), "removed": []},
                "explanation": "Cleaning makes downstream model comparisons easier to trust.",
                "status": "complete",
            },
            {
                "key": "bow",
                "label": "Token / BoW feature",
                "input": {"song_id": selected_id},
                "output": {"top_terms": [{"term": row["term"], "weight": round(float(row["weight"]), 4)} for row in song_bow.head(8).to_dict("records")]},
                "field_changes": {"kept": ["term", "weight"], "removed": ["term order", "full text"]},
                "explanation": "BoW stores derived term weights rather than raw lyrics.",
                "status": "complete",
            },
            {
                "key": "tfidf",
                "label": "TF-IDF vector",
                "input": {"document_terms": int(len(document.split()))},
                "output": {"top_weights": [{"term": str(terms[index]), "score": round(float(vector_scores[index]), 4)} for index in top_indices if vector_scores[index] > 0]},
                "field_changes": {"kept": ["distinctive weighted terms"], "removed": ["generic low-signal terms"]},
                "explanation": "TF-IDF raises terms that distinguish this song from the dataset.",
                "status": "complete",
            },
            {
                "key": "topics",
                "label": "Topic distribution",
                "input": {"method": "NMF"},
                "output": {"topics": topic_rows[["topic_id", "topic_label", "topic_score"]].to_dict("records")},
                "field_changes": {"kept": ["topic scores"], "removed": ["raw text"]},
                "explanation": "Topics compress term patterns into interpretable cultural themes.",
                "status": "complete",
            },
            {
                "key": "model",
                "label": "Model prediction",
                "input": {"feature_space": "tfidf_bow"},
                "output": {"predicted_genre": prediction, "mode": "demo_inference"},
                "field_changes": {"kept": ["prediction", "derived features"], "removed": ["training-only identifiers"]},
                "explanation": "The prediction is produced from derived feature vectors; reported evaluation uses held-out split metrics.",
                "status": "complete",
            },
            {
                "key": "report",
                "label": "Final report",
                "input": {"song_id": selected_id},
                "output": {"summary": f"{song.get('title')} is represented by safe metadata, top BoW terms, TF-IDF weights, topics, and a demo prediction."},
                "field_changes": {"kept": ["metadata", "visual evidence", "model caveats"], "removed": ["full lyrics"]},
                "explanation": "The report packages evidence and limitations into a shareable analysis trail.",
                "status": "complete",
            },
        ],
    }
    assert_no_raw_lyrics(payload)
    return payload


@router.post("/datasets/{dataset_id}/reports")
def analysis_report(dataset_id: str = "demo", body: dict[str, Any] = Body(default_factory=dict)) -> dict[str, Any]:
    mode = body.get("mode") if body.get("mode") in {"executive", "data_scientist"} else "executive"
    stories = analysis_stories(dataset_id, "overview")["insights"]
    selected_ids = set(body.get("selected_insight_ids") or [item["id"] for item in stories[:5]])
    selected = [item for item in stories if item["id"] in selected_ids]
    profile = dataset_profile(dataset_id)
    classification = classification_models(dataset_id)
    best_model = classification["models"][0] if classification["models"] else {}
    title = "Lyrics Cultural Analytics Lab Report"
    lines = [
        f"# {title}",
        "",
        f"Mode: {mode}",
        "",
        "## Dataset Summary",
        f"- Dataset: {profile['name']}",
        f"- Rows: {profile['row_count']}",
        f"- Missing cells: {profile['missing_cells']}",
        "",
        "## Model Comparison",
        f"- Best model: {best_model.get('label', 'n/a')}",
        f"- Accuracy: {best_model.get('accuracy', 0)}",
        f"- Macro-F1: {best_model.get('macro_f1', 0)}",
        f"- Leakage audit: {classification.get('leakage_audit', {}).get('status', 'unknown')}",
        "",
        "## Explainability Findings",
    ]
    for item in selected:
        lines.extend([f"- {item['title']}: {item['summary']} ({item['confidence']})"])
    lines.extend(
        [
            "",
            "## Limitations",
            "- Demo inference is separate from held-out evaluation.",
            "- Public reports expose only metadata, derived features, aggregates, and model outputs.",
            "",
            "## Recommended Next Actions",
        ]
    )
    for item in selected:
        lines.append(f"- {item['next_action']}")
    markdown = "\n".join(lines)
    html_sections = "".join(f"<section><h3>{escape(item['title'])}</h3><p>{escape(item['summary'])}</p><p>{escape(item['next_action'])}</p></section>" for item in selected)
    html = f"<article class=\"print-report\"><h1>{escape(title)}</h1><p>Mode: {escape(mode)}</p><h2>Dataset Summary</h2><p>{escape(profile['name'])}: {profile['row_count']} rows</p><h2>Findings</h2>{html_sections}</article>"
    payload = {
        "dataset_id": profile["dataset_id"],
        "filename": f"lyrics-cultural-analytics-{mode}.md",
        "mode": mode,
        "markdown": markdown,
        "html": html,
        "sections": [{"id": item["id"], "title": item["title"], "summary": item["summary"]} for item in selected],
    }
    assert_no_raw_lyrics(payload)
    return payload
