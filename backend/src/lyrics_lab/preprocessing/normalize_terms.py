import re


def normalize_term(term: str) -> str:
    return re.sub(r"[^a-z0-9_-]+", "", term.strip().lower())
