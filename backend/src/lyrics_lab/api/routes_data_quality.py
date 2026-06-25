import json

from fastapi import APIRouter

from lyrics_lab.utils.paths import sample_dir

router = APIRouter(prefix="/data-quality", tags=["data-quality"])


@router.get("/report")
def data_quality_report():
    path = sample_dir() / "data_quality_report.json"
    if not path.exists():
        return {"status": "missing", "tables": {}, "issues": [], "safety": {"no_raw_lyrics": None}}
    return json.loads(path.read_text(encoding="utf-8"))
