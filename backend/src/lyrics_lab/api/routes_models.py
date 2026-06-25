import json

from fastapi import APIRouter
import numpy as np
import pandas as pd

from lyrics_lab.api.schemas import GenrePredictionRequest, GenrePredictionResponse
from lyrics_lab.models.classification_pipeline import fit_full_demo_pipeline
from lyrics_lab.models.genre_classifier import predict_from_features
from lyrics_lab.utils.paths import sample_dir

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/genre-classifier/predict", response_model=GenrePredictionResponse)
def predict_genre(request: GenrePredictionRequest):
    return GenrePredictionResponse(**predict_from_features(request.features))


@router.post("/genre-classifier/explain")
def explain_genre(request: GenrePredictionRequest):
    root = sample_dir()
    bow = pd.read_csv(root / "lyric_bow_features.csv")
    songs = pd.read_csv(root / "songs.csv")
    pipeline = fit_full_demo_pipeline(bow, songs, "logistic_regression")
    vectorizer = pipeline.named_steps["tfidf"]
    model = pipeline.named_steps["model"]
    terms = []
    for term, weight in request.features.items():
        repeat = max(1, int(float(weight) * 5))
        terms.extend([term] * repeat)
    document = " ".join(terms) if terms else "dance light city"
    predicted = str(pipeline.predict([document])[0])
    if hasattr(model, "predict_proba"):
        probabilities = pipeline.predict_proba([document])[0]
        scores = {str(label): round(float(score), 4) for label, score in zip(model.classes_, probabilities, strict=True)}
        confidence = max(scores.values()) if scores else 0.0
    else:
        scores = {predicted: 0.5}
        confidence = 0.5
    matrix = vectorizer.transform([document])
    feature_names = vectorizer.get_feature_names_out()
    nonzero = matrix.toarray()[0]
    top_indices = np.argsort(nonzero)[-10:][::-1]
    top_terms = [{"term": str(feature_names[index]), "weight": round(float(nonzero[index]), 4)} for index in top_indices if nonzero[index] > 0]
    examples = (
        songs[songs["genre"] == predicted][["song_id", "title", "artist_id", "year", "genre"]]
        .head(5)
        .to_dict("records")
    )
    return {
        "mode": "demo_inference",
        "predicted_genre": predicted,
        "confidence": round(float(confidence), 4),
        "scores": scores,
        "top_terms": top_terms,
        "nearest_examples": examples,
        "leakage_note": "This endpoint uses a full-demo fitted model for interactive inference only. Reported evaluation metrics use train-only vectorizer fitting.",
    }


@router.get("/evaluation")
def model_evaluation():
    path = sample_dir() / "evaluation.json"
    if not path.exists():
        return {"accuracy": None, "macro_f1": None, "recall_at_k": None, "ndcg_at_k": None, "topic_coherence": None}
    return json.loads(path.read_text(encoding="utf-8"))
