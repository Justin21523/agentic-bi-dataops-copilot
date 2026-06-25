"""SQL guardrails: three-pass validation (regex + sqlparse AST + table whitelist).

This module is the primary security boundary for user-submitted SQL. It NEVER
modifies or sanitizes queries — it only rejects. Defense in depth: the query
executor also opens a read_only DuckDB connection.
"""
from __future__ import annotations

import re
from enum import Enum

import sqlparse
from sqlparse import tokens as T
from sqlparse.sql import Parenthesis

from ingestion.warehouse import RETAIL_TABLES
from utils.log import get_logger

log = get_logger(__name__)


class RiskLevel(str, Enum):
    SAFE = "safe"
    WARNING = "warning"
    CRITICAL = "critical"


class ValidationResult:
    """Outcome of SQL validation."""

    def __init__(
        self,
        is_safe: bool,
        reason: str,
        risk_level: RiskLevel,
        details: dict | None = None,
    ) -> None:
        self.is_safe = is_safe
        self.reason = reason
        self.risk_level = risk_level
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "is_safe": self.is_safe,
            "reason": self.reason,
            "risk_level": self.risk_level.value,
            "details": self.details,
        }

    def __repr__(self) -> str:
        return f"ValidationResult(is_safe={self.is_safe}, reason={self.reason!r}, risk_level={self.risk_level})"


# ── Pass 1: Regex patterns ─────────────────────────────────────────────────

_FORBIDDEN_KEYWORDS = re.compile(
    r"""\b(
        DROP | DELETE | UPDATE | INSERT | ALTER |
        TRUNCATE | CREATE | REPLACE | MERGE | EXEC |
        EXECUTE | GRANT | REVOKE | ATTACH | DETACH |
        COPY | VACUUM | PRAGMA | CALL | LOAD |
        IMPORT | EXPORT
    )\b""",
    re.VERBOSE | re.IGNORECASE,
)

_COMMENT_PATTERN = re.compile(r"--|/\*|\*/")
_NULL_BYTE = re.compile(r"\x00")

# FROM/JOIN table extraction regex (used in pass 3)
_FROM_JOIN_RE = re.compile(
    r"\b(?:FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|"
    r"CROSS\s+JOIN|NATURAL\s+JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)",
    re.IGNORECASE,
)

# CTE name extraction — captures ALL CTE names: `name AS (`
_CTE_NAME_RE = re.compile(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(', re.IGNORECASE)

# SQL keywords / function names / date parts that can appear after FROM inside
# function calls (e.g. EXTRACT(DOW FROM timestamp)) — not real table names
_SQL_NON_TABLE_WORDS = frozenset({
    'cast', 'extract', 'coalesce', 'nullif', 'ifnull', 'isnull',
    'timestamp', 'date', 'time', 'interval', 'epoch',
    'year', 'month', 'day', 'hour', 'minute', 'second',
    'dow', 'doy', 'week', 'quarter', 'isodow',
    'null', 'true', 'false',
    'current_date', 'current_time', 'current_timestamp',
})


# ── Pass 2: sqlparse AST helpers ───────────────────────────────────────────

def _check_multi_statement(sql: str) -> str | None:
    stmts = [s.strip() for s in sqlparse.split(sql) if s.strip()]
    if len(stmts) > 1:
        return f"Multiple SQL statements are not allowed ({len(stmts)} detected)"
    return None


def _check_statement_type(sql: str) -> str | None:
    stmt = sqlparse.parse(sql)[0]
    stmt_type = stmt.get_type()
    if stmt_type not in ("SELECT", "UNKNOWN", None):
        return f"Forbidden statement type: {stmt_type} — only SELECT is allowed"
    return None


def _check_comment_tokens(sql: str) -> str | None:
    stmt = sqlparse.parse(sql)[0]
    for tok in stmt.flatten():
        if tok.ttype in (T.Comment.Single, T.Comment.Multiline):
            snippet = tok.value[:40].replace("\n", " ")
            return f"SQL comment injection detected: {snippet!r}"
    return None


def _check_unbounded_star(sql: str) -> str | None:
    stmt = sqlparse.parse(sql)[0]
    has_star = has_where = has_limit = False
    paren_depth = 0
    for tok in stmt.flatten():
        if tok.ttype is T.Punctuation:
            if tok.value == '(':
                paren_depth += 1
            elif tok.value == ')':
                paren_depth -= 1
        # Only flag top-level wildcard (not COUNT(*) or similar)
        if tok.ttype == T.Wildcard and paren_depth == 0:
            has_star = True
        kw = tok.normalized.upper() if tok.ttype in (T.Keyword, T.Keyword.DML) else ""
        if kw == "WHERE":
            has_where = True
        if kw == "LIMIT":
            has_limit = True
    if has_star and not has_where and not has_limit:
        return "Full table scan detected: SELECT * without WHERE or LIMIT is not allowed"
    return None


def _subquery_depth(token: object, current: int = 0) -> int:
    max_depth = current
    if hasattr(token, "tokens"):
        for child in token.tokens:
            if isinstance(child, Parenthesis):
                d = _subquery_depth(child, current + 1)
                max_depth = max(max_depth, d)
            else:
                d = _subquery_depth(child, current)
                max_depth = max(max_depth, d)
    return max_depth


def _check_subquery_depth(sql: str, max_allowed: int = 3) -> str | None:
    stmt = sqlparse.parse(sql)[0]
    depth = _subquery_depth(stmt)
    if depth > max_allowed:
        return f"Subquery depth {depth} exceeds maximum allowed ({max_allowed})"
    return None


# ── Pass 3: Table whitelist ────────────────────────────────────────────────

def _extract_tables_regex(sql: str) -> set[str]:
    return {m.lower() for m in _FROM_JOIN_RE.findall(sql)}


def _extract_tables_ast(parsed) -> set[str]:
    """Walk sqlparse AST to extract table names from Identifier nodes.

    Tracks parenthesis depth so that FROM inside function calls
    (e.g. EXTRACT(DOW FROM timestamp)) is not mistaken for a table reference.
    """
    tables: set[str] = set()
    from_seen = False
    paren_depth = 0
    for tok in parsed.flatten():
        if tok.ttype is T.Punctuation:
            if tok.value == '(':
                paren_depth += 1
                from_seen = False  # FROM inside () belongs to a function call
            elif tok.value == ')':
                paren_depth = max(0, paren_depth - 1)
            continue
        # Only track table references at the top statement level
        if paren_depth > 0:
            continue
        kw = tok.normalized.upper() if tok.ttype in (T.Keyword, T.Keyword.DML) else ""
        if kw in ("FROM", "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN",
                  "FULL JOIN", "CROSS JOIN", "NATURAL JOIN"):
            from_seen = True
            continue
        if from_seen and tok.ttype in (T.Name, T.Literal.String.Single):
            name = tok.value.strip('"\'`').lower()
            if name and not name.startswith("("):
                tables.add(name)
            from_seen = False
        elif from_seen and tok.ttype in (T.Keyword, T.Keyword.DML, T.Punctuation):
            from_seen = False
    return tables


def _extract_cte_names(sql: str) -> set[str]:
    """Extract CTE alias names so they are not treated as real table names."""
    return {m.lower() for m in _CTE_NAME_RE.findall(sql)}


def _check_table_whitelist(sql: str, allowed: frozenset[str]) -> str | None:
    found = _extract_tables_regex(sql) | _extract_tables_ast(sqlparse.parse(sql)[0])
    # Filter out single-char aliases and pure numbers
    found = {t for t in found if len(t) > 1 and not t.isdigit()}
    # Exclude CTE names (virtual tables defined within the query)
    found -= _extract_cte_names(sql)
    # Exclude SQL keywords / function names / date parts that appear after FROM
    # inside function calls (e.g. EXTRACT(DOW FROM timestamp))
    found -= _SQL_NON_TABLE_WORDS
    illegal = found - allowed
    if illegal:
        return f"Non-whitelisted table(s): {sorted(illegal)} — only {sorted(allowed)} are allowed"
    return None


# ── Main entry point ───────────────────────────────────────────────────────

def validate_sql(
    sql: str,
    allowed_tables: frozenset[str] | None = None,
    strict: bool = True,
) -> ValidationResult:
    """Validate SQL through three independent passes.

    Args:
        sql: Raw SQL string from user or LLM.
        allowed_tables: Whitelisted table names. Defaults to RETAIL_TABLES.
        strict: If True, WARNING-level issues also block execution.

    Returns:
        ValidationResult with is_safe, reason, risk_level.
    """
    allowed = allowed_tables or RETAIL_TABLES
    sql_norm = " ".join(sql.split())  # normalize whitespace

    # Pass 1 — regex (fast)
    if _NULL_BYTE.search(sql_norm):
        return ValidationResult(False, "Null byte detected in query", RiskLevel.CRITICAL)

    if _COMMENT_PATTERN.search(sql_norm):
        m = _COMMENT_PATTERN.search(sql_norm)
        return ValidationResult(
            False, f"Comment injection detected: {m.group()!r}", RiskLevel.CRITICAL
        )

    if m := _FORBIDDEN_KEYWORDS.search(sql_norm):
        return ValidationResult(
            False, f"Forbidden keyword: {m.group().upper()}", RiskLevel.CRITICAL
        )

    # Pass 2 — sqlparse AST
    for check_fn in [_check_multi_statement, _check_statement_type, _check_comment_tokens]:
        if reason := check_fn(sql_norm):
            return ValidationResult(False, reason, RiskLevel.CRITICAL)

    # Pass 3 — table whitelist
    if reason := _check_table_whitelist(sql_norm, allowed):
        return ValidationResult(False, reason, RiskLevel.CRITICAL)

    # Warnings
    warnings: list[str] = []
    for check_fn in [_check_unbounded_star, _check_subquery_depth]:
        if reason := check_fn(sql_norm):
            warnings.append(reason)

    if warnings and strict:
        return ValidationResult(
            False,
            warnings[0],
            RiskLevel.WARNING,
            {"all_warnings": warnings},
        )

    log.debug("SQL passed validation: %s", sql_norm[:80])
    return ValidationResult(True, "", RiskLevel.SAFE)
