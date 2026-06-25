from fastapi import APIRouter

from lyrics_lab.evaluation.safety_checks import safety_audit_payload

router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("/policy")
def safety_policy():
    return {
        "no_full_lyrics": True,
        "displayed": ["metadata", "bag-of-words features", "topic labels", "sentiment scores", "style vectors", "aggregates"],
        "not_displayed": ["complete lyric text", "line-by-line lyric text"],
    }


@router.get("/audit")
def safety_audit():
    return safety_audit_payload()
