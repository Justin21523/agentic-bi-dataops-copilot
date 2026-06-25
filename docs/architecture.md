# Architecture

The project is a frontend/backend monorepo.

```mermaid
flowchart TD
  A[Safe feature inputs] --> B[Sample generator or loaders]
  B --> C[DuckDB tables]
  C --> D[Model pipelines]
  D --> C
  C --> E[FastAPI /api/v1]
  E --> F[React TypeScript dashboard]
```

The backend owns ingestion, feature generation, modeling, evaluation, and API contracts. The frontend owns bilingual presentation, filters, charts, search, and copyright-safety notices.
