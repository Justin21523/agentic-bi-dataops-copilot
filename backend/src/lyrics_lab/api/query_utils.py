from __future__ import annotations


def analytics_filters(
    genre: str | None = None,
    language: str | None = None,
    decade: int | None = None,
    region: str | None = None,
    song_alias: str = "s",
    artist_alias: str = "a",
) -> tuple[str, list[object]]:
    clauses: list[str] = []
    params: list[object] = []
    if genre:
        clauses.append(f"{song_alias}.genre = ?")
        params.append(genre)
    if language:
        clauses.append(f"{song_alias}.language = ?")
        params.append(language)
    if decade:
        clauses.append(f"{song_alias}.decade = ?")
        params.append(decade)
    if region:
        clauses.append(f"{artist_alias}.region = ?")
        params.append(region)
    return (" AND " + " AND ".join(clauses), params) if clauses else ("", [])


def limit_clause(limit: int | None, default: int = 50, maximum: int = 250) -> int:
    if limit is None:
        return default
    return max(1, min(maximum, limit))
