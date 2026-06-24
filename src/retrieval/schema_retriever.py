"""Schema retriever: keyword-match questions to relevant tables and build prompt strings."""
from __future__ import annotations

import re

from features.catalog import Catalog, TableMeta, get_schema_context, get_metric_context
from utils.log import get_logger

log = get_logger(__name__)

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


def find_relevant_tables(
    question: str,
    catalog: Catalog,
    top_k: int = 3,
    min_score: int = 0,
) -> list[str]:
    """Return top_k table names most relevant to the question.

    Args:
        question: Natural language question from the user.
        catalog: Loaded Catalog with table metadata.
        top_k: Maximum number of tables to return.
        min_score: Minimum score to include a table (0 = include all).

    Returns:
        Sorted list of relevant table names (highest score first).
    """
    q_tokens = _tokenize(question)
    scores: dict[str, int] = {}
    for tname, tmeta in catalog.tables.items():
        scores[tname] = _score_table(q_tokens, tmeta)

    ranked = sorted(scores, key=lambda k: scores[k], reverse=True)
    result = [t for t in ranked if scores[t] >= min_score]
    return result[:top_k]


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
