"""GET /dq/report — data quality report for all warehouse tables."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from api.dependencies import get_catalog, get_db
from api.schemas import DQColumnReport, DQReport, DQTableReport
from utils.log import get_logger

log = get_logger(__name__)
router = APIRouter()


@router.get("/report", response_model=DQReport)
def dq_report(
    db=Depends(get_db),
    catalog=Depends(get_catalog),
):
    """Compute basic data quality stats for all warehouse tables."""
    table_reports: list[DQTableReport] = []

    for tname, tmeta in catalog.tables.items():
        try:
            row_count = db.execute(f"SELECT COUNT(*) FROM {tname}").fetchone()[0]

            col_reports: list[DQColumnReport] = []
            for col in tmeta.columns:
                try:
                    stats = db.execute(
                        f"""
                        SELECT
                            COUNT(*) - COUNT({col.name}) AS null_count,
                            COUNT(DISTINCT {col.name})   AS distinct_count,
                            CAST(MIN({col.name}) AS VARCHAR) AS min_val,
                            CAST(MAX({col.name}) AS VARCHAR) AS max_val
                        FROM {tname}
                        """
                    ).fetchone()
                    null_count = stats[0] or 0
                    distinct_count = stats[1] or 0
                    null_pct = round(null_count / max(row_count, 1) * 100, 2)
                    col_reports.append(
                        DQColumnReport(
                            column_name=col.name,
                            dtype=col.type,
                            null_count=null_count,
                            null_pct=null_pct,
                            distinct_count=distinct_count,
                            min_val=stats[2],
                            max_val=stats[3],
                        )
                    )
                except Exception as e:
                    log.debug(f"DQ stat failed for {tname}.{col.name}: {e}")
                    col_reports.append(
                        DQColumnReport(
                            column_name=col.name,
                            dtype=col.type,
                            null_count=0,
                            null_pct=0.0,
                            distinct_count=0,
                        )
                    )

            table_reports.append(
                DQTableReport(
                    table_name=tname,
                    row_count=row_count,
                    columns=col_reports,
                )
            )
        except Exception as e:
            log.warning(f"DQ report failed for table {tname}: {e}")

    return DQReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        tables=table_reports,
    )
