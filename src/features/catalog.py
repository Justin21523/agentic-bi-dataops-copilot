"""Metadata catalog loader and schema context builder for LLM prompt injection."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from utils.log import get_logger

log = get_logger(__name__)


@dataclass
class ColumnMeta:
    name: str
    type: str
    description: str
    sample_values: list[Any] = field(default_factory=list)
    semantic_tags: list[str] = field(default_factory=list)
    nullable: bool = True


@dataclass
class TableRelationship:
    column: str
    references: str
    type: str


@dataclass
class TableMeta:
    name: str
    description: str
    primary_key: str
    columns: list[ColumnMeta]
    keywords: list[str] = field(default_factory=list)
    relationships: list[TableRelationship] = field(default_factory=list)
    row_count_approx: int | None = None


@dataclass
class MetricDefinition:
    name: str
    display_name: str
    description: str
    formula: str
    tables: list[str]
    unit: str
    aliases: list[str] = field(default_factory=list)


@dataclass
class Catalog:
    version: str
    description: str
    tables: dict[str, TableMeta]
    metric_dictionary: dict[str, MetricDefinition]

    def table_names(self) -> list[str]:
        return sorted(self.tables.keys())

    def get_table(self, name: str) -> TableMeta | None:
        return self.tables.get(name)


def load_catalog(path: Path | None = None) -> Catalog:
    """Parse catalog.yaml into a typed Catalog dataclass.

    Args:
        path: Path to catalog YAML. Defaults to settings.metadata_catalog_path.
    """
    if path is None:
        from utils.config import get_settings
        path = Path(get_settings().metadata_catalog_path)

    log.info(f"Loading catalog from {path}")
    with open(path) as f:
        raw = yaml.safe_load(f)

    tables: dict[str, TableMeta] = {}
    for tname, tdata in raw.get("tables", {}).items():
        columns = [
            ColumnMeta(
                name=col["name"],
                type=col["type"],
                description=col.get("description", ""),
                sample_values=col.get("sample_values", []),
                semantic_tags=col.get("semantic_tags", []),
                nullable=col.get("nullable", True),
            )
            for col in tdata.get("columns", [])
        ]
        relationships = [
            TableRelationship(
                column=r["column"],
                references=r["references"],
                type=r["type"],
            )
            for r in tdata.get("relationships", [])
        ]
        tables[tname] = TableMeta(
            name=tname,
            description=tdata.get("description", "").strip(),
            primary_key=tdata.get("primary_key", ""),
            columns=columns,
            keywords=tdata.get("keywords", []),
            relationships=relationships,
            row_count_approx=tdata.get("row_count_approx"),
        )

    metrics: dict[str, MetricDefinition] = {}
    for mname, mdata in raw.get("metric_dictionary", {}).items():
        metrics[mname] = MetricDefinition(
            name=mname,
            display_name=mdata.get("display_name", mname),
            description=mdata.get("description", ""),
            formula=mdata.get("formula", ""),
            tables=mdata.get("tables", []),
            unit=mdata.get("unit", ""),
            aliases=mdata.get("aliases", []),
        )

    log.info(f"Catalog loaded: {len(tables)} tables, {len(metrics)} metrics")
    return Catalog(
        version=raw.get("version", "1.0"),
        description=raw.get("description", "").strip(),
        tables=tables,
        metric_dictionary=metrics,
    )


def get_table_context(catalog: Catalog, table_name: str) -> str:
    """Return a formatted single-table schema block for LLM prompts."""
    meta = catalog.get_table(table_name)
    if meta is None:
        return f"Table '{table_name}' not found in catalog."

    lines = [
        f"Table: {meta.name}",
        f"Description: {meta.description}",
        f"Primary Key: {meta.primary_key}",
        "Columns:",
    ]
    for col in meta.columns:
        tags = f"  [{', '.join(col.semantic_tags)}]" if col.semantic_tags else ""
        nullable_str = "" if col.nullable else " NOT NULL"
        lines.append(f"  {col.name:<20} {col.type:<12}{nullable_str:<10} {col.description}{tags}")

    if meta.relationships:
        lines.append("Relationships:")
        for rel in meta.relationships:
            lines.append(f"  {rel.column} → {rel.references} ({rel.type})")

    return "\n".join(lines)


def get_schema_context(
    catalog: Catalog,
    table_names: list[str] | None = None,
) -> str:
    """Return formatted multi-table schema context for LLM system prompt injection.

    Args:
        catalog: Loaded Catalog.
        table_names: Subset of tables to include; None includes all.
    """
    names = table_names or catalog.table_names()
    blocks = [get_table_context(catalog, name) for name in names]
    return "\n\n".join(blocks)


def get_metric_context(catalog: Catalog) -> str:
    """Return the metric dictionary as a formatted string for LLM prompts."""
    if not catalog.metric_dictionary:
        return ""
    lines = ["Metric Dictionary:"]
    for metric in catalog.metric_dictionary.values():
        lines.append(f"  {metric.display_name} ({metric.name}): {metric.description}")
        lines.append(f"    Formula: {metric.formula}")
        if metric.aliases:
            lines.append(f"    Also known as: {', '.join(metric.aliases)}")
    return "\n".join(lines)


def find_columns_by_tag(
    catalog: Catalog,
    tag: str,
    table_name: str | None = None,
) -> list[tuple[str, str]]:
    """Return (table_name, column_name) pairs matching a semantic tag."""
    results = []
    tables = {table_name: catalog.tables[table_name]} if table_name else catalog.tables
    for tname, tmeta in tables.items():
        for col in tmeta.columns:
            if tag in col.semantic_tags:
                results.append((tname, col.name))
    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Validate and preview the metadata catalog")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    if args.validate:
        cat = load_catalog()
        print(get_schema_context(cat))
        print("\n" + get_metric_context(cat))
