"""POST /chart/recommend — chart recommendation from result schema."""
from __future__ import annotations

from fastapi import APIRouter

from api.schemas import ChartRecommendRequest, ChartRecommendation
from features.chart_recommender import ColumnSchema as ChartColSchema, recommend

router = APIRouter()


@router.post("/recommend", response_model=ChartRecommendation)
def chart_recommend(req: ChartRecommendRequest):
    """Recommend a chart type for the given column schema."""
    col_schemas = [ChartColSchema(name=c.name, dtype=c.dtype) for c in req.columns]
    rec = recommend(col_schemas, req.row_count)
    return ChartRecommendation(**rec.to_dict())
