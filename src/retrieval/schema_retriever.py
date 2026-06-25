"""Schema retriever: keyword + semantic matching to surface relevant tables and build prompt strings."""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

from features.catalog import Catalog, TableMeta, get_schema_context, get_metric_context
from utils.log import get_logger

if TYPE_CHECKING:
    pass

log = get_logger(__name__)

_EMBEDDING_MODEL_PATH = "/mnt/c/ai_models/language/sentence_transformers/paraphrase-multilingual-MiniLM-L12-v2"


@lru_cache(maxsize=1)
def _get_embedding_model():
    """Load sentence-transformer model once; returns None if unavailable."""
    try:
        from sentence_transformers import SentenceTransformer
        model_path = Path(_EMBEDDING_MODEL_PATH)
        if model_path.exists():
            return SentenceTransformer(str(model_path))
        # Try HuggingFace hub fallback
        return SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    except Exception as e:
        log.debug(f"Semantic schema retrieval unavailable ({e}), using keyword mode")
        return None

_TOKENIZE_RE = re.compile(r"\b[a-z][a-z0-9_]*\b")


def _tokenize(text: str) -> set[str]:
    """Lowercase word tokens, splitting on underscores too."""
    tokens = set(_TOKENIZE_RE.findall(text.lower()))
    extra: set[str] = set()
    for t in tokens:
        extra.update(t.split("_"))
    return tokens | extra


def _score_table(question_tokens: set[str], table: TableMeta) -> int:
    """Score a table by keyword overlap with the question.

    Scoring weights:
    - Table name exact match:        +10
    - Table keyword match:           +8
    - Column name match:             +3
    - Column name part match:        +2
    - Description word match:        +1
    """
    score = 0
    q = question_tokens

    if table.name in q:
        score += 10

    for kw in table.keywords:
        if kw.lower() in q:
            score += 8

    for col in table.columns:
        if col.name in q:
            score += 3
        for part in col.name.split("_"):
            if part in q and len(part) > 2:
                score += 2

    desc_tokens = _tokenize(table.description)
    overlap = len(q & desc_tokens)
    score += min(overlap, 5)

    return score


def _semantic_scores(question: str, catalog: Catalog) -> dict[str, float] | None:
    """Return cosine similarity scores per table using sentence-transformers.

    Returns None if the embedding model is unavailable.
    """
    model = _get_embedding_model()
    if model is None:
        return None
    try:
        import numpy as np
        # Build table descriptions combining name + keywords + column names
        table_texts = []
        table_names = []
        for tname, tmeta in catalog.tables.items():
            desc = f"{tname} {tmeta.description} " + " ".join(tmeta.keywords) + " " + " ".join(c.name for c in tmeta.columns)
            table_texts.append(desc)
            table_names.append(tname)

        q_emb = model.encode([question], normalize_embeddings=True)
        t_embs = model.encode(table_texts, normalize_embeddings=True)
        sims = (q_emb @ t_embs.T)[0]
        return {name: float(sim) for name, sim in zip(table_names, sims)}
    except Exception as e:
        log.debug(f"Semantic scoring failed: {e}")
        return None


def find_relevant_tables(
    question: str,
    catalog: Catalog,
    top_k: int = 3,
    min_score: int = 0,
) -> list[str]:
    """Return top_k table names most relevant to the question.

    Uses semantic similarity (sentence-transformers) when available,
    blended with keyword scoring. Falls back to keyword-only if no model.

    Args:
        question: Natural language question from the user.
        catalog: Loaded Catalog with table metadata.
        top_k: Maximum number of tables to return.
        min_score: Minimum keyword score to include a table (0 = include all).

    Returns:
        Sorted list of relevant table names (highest score first).
    """
    q_tokens = _tokenize(question)
    keyword_scores: dict[str, int] = {}
    for tname, tmeta in catalog.tables.items():
        keyword_scores[tname] = _score_table(q_tokens, tmeta)

    # Try semantic scoring and blend with keyword scores (60% semantic, 40% keyword)
    sem_scores = _semantic_scores(question, catalog)
    if sem_scores:
        # Normalize keyword scores to [0,1]
        max_kw = max(keyword_scores.values()) or 1
        combined: dict[str, float] = {}
        for tname in catalog.tables:
            kw_norm = keyword_scores[tname] / max_kw
            sem = sem_scores.get(tname, 0.0)
            combined[tname] = 0.4 * kw_norm + 0.6 * sem
        ranked = sorted(combined, key=lambda k: combined[k], reverse=True)
    else:
        ranked = sorted(keyword_scores, key=lambda k: keyword_scores[k], reverse=True)
        ranked = [t for t in ranked if keyword_scores[t] >= min_score]

    return ranked[:top_k]


def build_schema_prompt(
    catalog: Catalog,
    table_names: list[str],
    include_metrics: bool = True,
) -> str:
    """Build a compact schema prompt string for LLM injection.

    Args:
        catalog: Loaded Catalog.
        table_names: Tables to include in the prompt.
        include_metrics: Whether to append the metric dictionary.

    Returns:
        Formatted schema string ready to inject into an LLM system prompt.
    """
    schema_ctx = get_schema_context(catalog, table_names)
    if include_metrics:
        metric_ctx = get_metric_context(catalog)
        return f"{schema_ctx}\n\n{metric_ctx}"
    return schema_ctx


def get_full_schema_prompt(catalog: Catalog) -> str:
    """Return schema prompt including all tables. Used in evaluation."""
    return build_schema_prompt(catalog, catalog.table_names(), include_metrics=True)
