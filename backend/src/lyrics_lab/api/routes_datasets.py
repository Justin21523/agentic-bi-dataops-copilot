from __future__ import annotations

import shutil
import time
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from lyrics_lab.ingestion.data_quality import build_quality_report
from lyrics_lab.ingestion.import_data import normalize_aliases
from lyrics_lab.ingestion.prepare_data import ensure_optional_derived_inputs
from lyrics_lab.ingestion.validate_safe_data import enrich_optional_columns, validate_dataset
from lyrics_lab.models.train import train
from lyrics_lab.evaluation.run_evaluation import evaluate
from lyrics_lab.utils.datasets import uploads_dir

router = APIRouter(prefix="/datasets", tags=["datasets"])

REQUIRED_UPLOAD_FILES = {"artists.csv", "songs.csv", "lyric_bow_features.csv"}


def _step(label: str, status: str = "pending", started: float | None = None, outputs: list[str] | None = None, metrics: dict[str, object] | None = None, message: str = "") -> dict[str, object]:
    return {
        "step": label.lower().replace(" ", "_"),
        "label": label,
        "status": status,
        "duration_ms": round((time.perf_counter() - started) * 1000, 1) if started is not None else 0,
        "outputs": outputs or [],
        "metrics": metrics or {},
        "message": message,
    }


def _suggestions(validation: dict[str, object] | None = None, error: str | None = None) -> list[str]:
    suggestions: list[str] = []
    if validation:
        for filename in validation.get("missing_files", []) or []:
            suggestions.append(f"Add required file: {filename}.")
        missing_columns = validation.get("missing_columns", {}) or {}
        if isinstance(missing_columns, dict):
            for filename, columns in missing_columns.items():
                suggestions.append(f"{filename} is missing columns: {', '.join(columns)}.")
        forbidden = validation.get("forbidden_fields", {}) or {}
        if isinstance(forbidden, dict):
            for filename, columns in forbidden.items():
                suggestions.append(f"Remove protected lyric columns from {filename}: {', '.join(columns)}.")
    if error:
        suggestions.append("Increase sample size and class diversity if model training or topic modeling failed.")
        suggestions.append(error)
    return suggestions or ["Verify the CSV bundle uses safe derived features and required schema columns."]


def _safe_upload_name(filename: str | None) -> str:
    name = Path(filename or "").name
    if name not in REQUIRED_UPLOAD_FILES:
        raise HTTPException(status_code=400, detail=f"Unsupported file: {filename}. Required files are artists.csv, songs.csv, lyric_bow_features.csv.")
    return name


@router.post("/upload")
async def upload_dataset(files: list[UploadFile] = File(...)) -> dict[str, object]:
    filenames = {_safe_upload_name(file.filename) for file in files}
    missing = sorted(REQUIRED_UPLOAD_FILES - filenames)
    if missing:
        validation = {"status": "fail", "missing_files": missing}
        raise HTTPException(status_code=400, detail={"status": "fail", "validation": validation, "suggestions": _suggestions(validation)})

    dataset_id = f"upload_{uuid4().hex[:12]}"
    target = uploads_dir() / dataset_id
    target.mkdir(parents=True, exist_ok=False)
    timeline: list[dict[str, object]] = []

    try:
        for file in files:
            name = _safe_upload_name(file.filename)
            with (target / name).open("wb") as handle:
                shutil.copyfileobj(file.file, handle)
        started = time.perf_counter()
        normalize_aliases(target)
        enrich_optional_columns(target)
        validation = validate_dataset(target)
        timeline.append(_step("Validation", "complete" if validation["status"] == "pass" else "failed", started, list(REQUIRED_UPLOAD_FILES), validation.get("row_counts", {}), "Schema and protected-field validation completed."))
        if validation["status"] != "pass":
            return {"dataset_id": dataset_id, "status": "fail", "validation": validation, "processing_timeline": timeline, "suggestions": _suggestions(validation)}
        started = time.perf_counter()
        ensure_optional_derived_inputs(target)
        timeline.append(_step("Cleaning", "complete", started, ["songs.csv", "artists.csv"], {}, "Optional columns and safe derived defaults were prepared."))
        started = time.perf_counter()
        train(target)
        timeline.append(_step("Feature generation", "complete", started, ["lyric_topics.csv", "genre_predictions.csv", "similar_songs.csv", "yearly_terms.csv"], {}, "TF-IDF, topics, classifier predictions, similarity, and yearly term outputs were generated."))
        started = time.perf_counter()
        evaluation = evaluate(target)
        timeline.append(_step("Training", "complete", started, ["evaluation.json"], {"accuracy": evaluation.get("accuracy"), "macro_f1": evaluation.get("macro_f1")}, "Held-out evaluation and leakage audit completed."))
        started = time.perf_counter()
        quality = build_quality_report(target)
        timeline.append(_step("Evaluation", "complete", started, ["data_quality_report.json"], {"quality_status": quality.get("status")}, "Data quality report is ready for the dashboard."))
        return {
            "dataset_id": dataset_id,
            "status": "ready",
            "validation": validation,
            "processing_timeline": timeline,
            "suggestions": [],
            "quality": quality,
            "evaluation": {
                "accuracy": evaluation.get("accuracy"),
                "macro_f1": evaluation.get("macro_f1"),
                "leakage_audit": evaluation.get("leakage_audit"),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        timeline.append(_step("Pipeline", "failed", time.perf_counter(), [], {}, str(exc)))
        raise HTTPException(status_code=400, detail={"status": "fail", "error": str(exc), "processing_timeline": timeline, "suggestions": _suggestions(error=str(exc))}) from exc
