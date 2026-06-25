FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./

RUN uv sync --no-group dev

COPY src/ ./src/
COPY configs/ ./configs/
COPY scripts/ ./scripts/
COPY data/metadata/ ./data/metadata/
COPY .env.example ./.env

RUN mkdir -p data/sample data/schemas

EXPOSE 8000 8501

CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
