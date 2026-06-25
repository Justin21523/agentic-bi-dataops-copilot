"""GET /metadata/tables and GET /metadata/tables/{name}."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_catalog
from api.schemas import ColumnInfo, TableSchemaResponse, TableSummary

router = APIRouter()


@router.get("/tables", response_model=list[TableSummary])
def list_tables(catalog=Depends(get_catalog)):
    """Return all tables with brief descriptions."""
    return [
        TableSummary(
            name=name,
            description=meta.description,
            row_count_approx=meta.row_count_approx,
            column_count=len(meta.columns),
        )
        for name, meta in catalog.tables.items()
    ]


@router.get("/tables/{table_name}", response_model=TableSchemaResponse)
def get_table_schema(table_name: str, catalog=Depends(get_catalog)):
    """Return full schema for a specific table."""
    meta = catalog.get_table(table_name)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

    return TableSchemaResponse(
        name=meta.name,
        description=meta.description,
        primary_key=meta.primary_key,
        row_count_approx=meta.row_count_approx,
        columns=[
            ColumnInfo(
                name=col.name,
                dtype=col.type,
                description=col.description,
                nullable=col.nullable,
                semantic_tags=col.semantic_tags,
                sample_values=col.sample_values,
            )
            for col in meta.columns
        ],
        relationships=[
            {"column": r.column, "references": r.references, "type": r.type}
            for r in meta.relationships
        ],
    )
