---
title: "Agentic BI / DataOps Copilot"
tagline: "Schema-aware Text2SQL with three-pass SQL guardrails over a DuckDB retail warehouse"
summary: "A bilingual (EN/ZH) natural language analytics platform that turns plain questions into safe SQL queries. Features three-layer SQL validation, DuckDB in-process analytics, a React dashboard with 14 pages, a 16-step guided Data Journey tour, and full Playwright E2E evidence."
role: "Full-stack Data Product Developer"
problem: "BI analysts need to query retail warehouse data in natural language without risking unsafe SQL execution — every LLM-generated SQL must be validated before touching the database."
solution: "A schema-aware Text2SQL pipeline with three independent safety passes (regex, AST, table whitelist), read-only DuckDB execution, and a React frontend with a guided onboarding tour that walks through every DataOps stage."
outcome: "Deployed a production-like AI data product with 41 passing tests, Playwright-validated UI across 14 pages, and a live guided tour covering 16 DataOps pipeline stages."
highlights:
  - "Three-pass SQL validator: regex → AST → table whitelist for defense-in-depth"
  - "Rule-based Text2SQL baseline runs with zero API key — OpenAI GPT-4o available as upgrade"
  - "DuckDB read-only connection as a second layer of defense against write operations"
  - "React + Vite frontend with 14 pages, internationalization (ZH/EN), and dark mode"
  - "16-step Data Journey guided tour auto-starts on every page load with Playwright evidence"
  - "FastAPI backend with structured benchmark evaluation (valid_sql_rate, unsafe_rejection_rate)"
challenges:
  - "Restoring all BI Copilot source files overwritten by an unrelated project merge via git rebase"
  - "Deploying through GitHub Actions SSH to a server behind a non-standard port"
  - "Configuring Vite base path and API routing to integrate into the portfolio proxy structure"
nextSteps:
  - "Add JWT authentication middleware to FastAPI"
  - "Replace keyword scoring with sentence-transformer embeddings"
  - "Add streaming SSE responses for real-time query progress"
---
Agentic BI / DataOps Copilot is a portfolio-quality demonstration of safe, schema-aware natural language querying over a synthetic retail DuckDB warehouse. It shows production-like SQL safety patterns, evaluability, and a polished frontend with guided onboarding — all running without a paid LLM API key by default.
