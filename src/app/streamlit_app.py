"""Agentic BI / DataOps Copilot — Streamlit home page."""
from __future__ import annotations

import os

import httpx
import streamlit as st

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(
    page_title="Agentic BI Copilot",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Global styles ────────────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    .main-header {
        background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #1e3a5f 100%);
        padding: 2rem 2rem 1.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        color: white;
    }
    .main-header h1 { color: white; margin: 0; font-size: 2rem; font-weight: 700; }
    .main-header p  { color: #b8d4f0; margin: 0.5rem 0 0; font-size: 1rem; }

    .stat-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1.2rem;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .stat-card .value { font-size: 1.8rem; font-weight: 700; color: #1e3a5f; }
    .stat-card .label { font-size: 0.8rem; color: #718096; margin-top: 0.2rem; }

    .feature-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1.4rem;
        height: 100%;
        box-shadow: 0 1px 3px rgba(0,0,0,.06);
        transition: transform 0.15s, box-shadow 0.15s;
    }
    .feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .feature-card h4 { color: #1e3a5f; font-size: 1.05rem; font-weight: 600; margin: 0.5rem 0 0.3rem; }
    .feature-card p  { color: #4a5568; font-size: 0.85rem; line-height: 1.5; margin: 0; }

    .status-ok   { color: #38a169; font-weight: 600; }
    .status-err  { color: #e53e3e; font-weight: 600; }
    .badge       { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-green { background: #c6f6d5; color: #276749; }
    .badge-red   { background: #fed7d7; color: #9b2c2c; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(
    """
    <div class="main-header">
        <h1>🤖 Agentic BI / DataOps Copilot</h1>
        <p>Schema-aware Text2SQL · SQL Guardrails · Chart Recommendations · Data Quality</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── API health check ──────────────────────────────────────────────────────────
col_status, col_version, col_db = st.columns(3)
try:
    resp = httpx.get(f"{API_BASE}/health", timeout=4.0)
    health = resp.json()
    with col_status:
        st.markdown(
            '<div class="stat-card">'
            f'<div class="value"><span class="status-ok">●</span> Online</div>'
            '<div class="label">API Status</div></div>',
            unsafe_allow_html=True,
        )
    with col_version:
        st.markdown(
            '<div class="stat-card">'
            f'<div class="value">v{health.get("version","0.1.0")}</div>'
            '<div class="label">Version</div></div>',
            unsafe_allow_html=True,
        )
    with col_db:
        db_ok = health.get("db_status", "") == "connected"
        st.markdown(
            '<div class="stat-card">'
            f'<div class="value">'
            f'{"<span class=\\"status-ok\\">●</span> Connected" if db_ok else "<span class=\\"status-err\\">● Error</span>"}'
            f'</div><div class="label">DuckDB Warehouse</div></div>',
            unsafe_allow_html=True,
        )
except Exception:
    st.error(
        "⚠️  Cannot connect to the API at **" + API_BASE + "**. "
        "Run `make api` in another terminal."
    )

st.markdown("<br>", unsafe_allow_html=True)

# ── Feature cards ─────────────────────────────────────────────────────────────
st.markdown("### Navigate to a feature")
c1, c2, c3, c4 = st.columns(4)

with c1:
    st.markdown(
        """<div class="feature-card">
        <div style="font-size:2rem">💬</div>
        <h4>NL Query</h4>
        <p>Ask questions in plain language. Converts to SQL, validates safety, runs the query, and recommends a chart.</p>
        </div>""",
        unsafe_allow_html=True,
    )

with c2:
    st.markdown(
        """<div class="feature-card">
        <div style="font-size:2rem">📜</div>
        <h4>Query History</h4>
        <p>Browse all past queries with timestamps, generated SQL, execution times, and safety outcomes.</p>
        </div>""",
        unsafe_allow_html=True,
    )

with c3:
    st.markdown(
        """<div class="feature-card">
        <div style="font-size:2rem">🔍</div>
        <h4>Data Quality</h4>
        <p>Inspect null rates, distinct counts, and value ranges across all warehouse tables.</p>
        </div>""",
        unsafe_allow_html=True,
    )

with c4:
    st.markdown(
        """<div class="feature-card">
        <div style="font-size:2rem">📋</div>
        <h4>Schema Explorer</h4>
        <p>Browse table schemas, column descriptions, semantic tags, and sample values from the metadata catalog.</p>
        </div>""",
        unsafe_allow_html=True,
    )

st.markdown("<br>", unsafe_allow_html=True)

# ── Quick start ───────────────────────────────────────────────────────────────
with st.expander("🚀 Quick Start", expanded=False):
    st.markdown(
        """
        ```bash
        # 1. Generate synthetic retail data
        make sample-data

        # 2. Load into DuckDB warehouse
        make etl

        # 3. Start the FastAPI backend (keep running)
        make api

        # 4. Start this Streamlit app (in another terminal)
        make app
        ```

        Then navigate to the **NL Query** page in the sidebar and try:
        > *"Show me top 10 customers by revenue"*
        """
    )

st.markdown("---")
st.caption(
    "Agentic BI / DataOps Copilot v0.1.0 · "
    "[GitHub](#) · "
    "Data: Synthetic retail — for research and portfolio demonstration only."
)
