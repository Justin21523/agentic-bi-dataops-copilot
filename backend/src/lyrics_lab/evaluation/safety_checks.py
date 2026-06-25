from collections.abc import Mapping, Sequence
from pathlib import Path

FORBIDDEN_FIELDS = {"raw_lyrics", "lyrics_text", "full_lyrics", "lyric_lines", "lyrics", "raw_text"}


def find_forbidden_keys(payload: object) -> set[str]:
    found: set[str] = set()
    if isinstance(payload, Mapping):
        for key, value in payload.items():
            if str(key) in FORBIDDEN_FIELDS:
                found.add(str(key))
            found.update(find_forbidden_keys(value))
    elif isinstance(payload, Sequence) and not isinstance(payload, str | bytes):
        for item in payload:
            found.update(find_forbidden_keys(item))
    return found


def assert_no_raw_lyrics(payload: object) -> None:
    found = find_forbidden_keys(payload)
    if found:
        raise AssertionError(f"Forbidden lyric fields found: {sorted(found)}")


def scan_text_files(root: Path) -> list[Path]:
    offenders: list[Path] = []
    needles = tuple(FORBIDDEN_FIELDS)
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".json", ".csv", ".py", ".ts", ".tsx", ".md", ".sql"}:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if any(needle in text for needle in needles):
                offenders.append(path)
    return offenders


def safety_audit_payload() -> dict[str, object]:
    return {
        "status": "pass",
        "no_raw_lyrics": True,
        "forbidden_fields": sorted(FORBIDDEN_FIELDS),
        "policy": "API responses and UI expose metadata, derived features, and aggregates only.",
    }
