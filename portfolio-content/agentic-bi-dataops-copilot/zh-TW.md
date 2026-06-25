---
title: "Agentic BI / DataOps Copilot"
tagline: "具備三層 SQL 安全驗證的 Schema-aware Text2SQL，運行在 DuckDB 零售倉儲上"
summary: "中英雙語自然語言分析平台，將使用者問題轉換為安全的 SQL 查詢。具備三層 SQL 驗證、DuckDB 內建分析、React 14 頁儀表板、16 步驟 Data Journey 導覽，以及完整的 Playwright E2E 截圖與錄影。"
role: "Full-stack Data Product Developer"
problem: "BI 分析師需要用自然語言查詢零售倉儲資料，但每一條 LLM 生成的 SQL 在執行前都必須通過安全驗證，避免危險操作直接觸及資料庫。"
solution: "Schema-aware Text2SQL 管線，配備三道獨立安全關卡（Regex、AST、Table Whitelist），DuckDB read-only 連線作為第二道防線，React 前端提供全功能導覽 tour，逐步展示每個 DataOps 階段。"
outcome: "完成可部署的 AI 資料產品，41 個測試全數通過，Playwright 驗證 14 個頁面，導覽 tour 覆蓋 16 個 DataOps 管線階段。"
highlights:
  - "三層 SQL 驗證器：Regex → AST → Table Whitelist，縱深防禦"
  - "Rule-based Text2SQL 基準無需 API Key 即可運行，OpenAI GPT-4o 可選升級"
  - "DuckDB read-only 連線作為第二層寫入防護"
  - "React + Vite 前端，14 個頁面，支援中英雙語與深色模式"
  - "16 步驟 Data Journey 導覽，每次進入頁面自動啟動，附 Playwright 錄影與截圖"
  - "FastAPI 後端，含結構化 benchmark 評估（valid_sql_rate、unsafe_rejection_rate）"
challenges:
  - "透過 git rebase 恢復被不相關專案覆蓋的所有 BI Copilot 原始檔案"
  - "透過 GitHub Actions SSH 部署到非標準 port 的遠端伺服器"
  - "配置 Vite base path 與 API routing，整合進 portfolio 的 nginx proxy 架構"
nextSteps:
  - "在 FastAPI 加入 JWT 認證中介層"
  - "以 sentence-transformer embeddings 取代 keyword scoring"
  - "加入 SSE streaming 回應，提供即時查詢進度"
---
Agentic BI / DataOps Copilot 是一個展示安全、可解釋、可評估 Text2SQL 的 portfolio 級專案。它在不需付費 LLM API Key 的情況下，即可對合成零售 DuckDB 倉儲進行自然語言查詢，並以精心設計的前端與導覽 tour 展示完整的 DataOps 工作流。
