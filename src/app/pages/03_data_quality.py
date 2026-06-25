"""Page 3: Data Quality Report — null rates, distinct counts, value ranges."""
from __future__ import annotations

import os

import httpx
import pandas as pd
import plotly.express as px
import streamlit as st

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(page_title="Data Quality · BI Copilot", page_icon="🔍", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    .dq-header { font-size:1.1rem; font-weight:600; color:#1e3a5f; margin:.5rem 0; }
    </style>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.markdown("### 🔍 Data Quality")
    if st.button("🔄 Refresh report"):
        st.rerun()
    st.markdown("---")
    st.caption("Shows null rates, distinct counts, and value ranges for all warehouse tables.")

st.markdown("## 🔍 Data Quality Report")

with st.spinner("Loading data quality report..."):
    try:
        resp = httpx.get(f"{API_BASE}/dq/report", timeout=30.0)
        resp.raise_for_status()
        report = resp.json()
    except Exception as e:
        st.error(f"Could not load DQ report: {e}")
        st.stop()

tables = report.get("tables", [])
generated_at = report.get("generated_at", "")
st.caption(f"Generated at: {generated_at[:19]}")

if not tables:
    st.info("No data in warehouse. Run `make sample-data && make etl` first.")
    st.stop()

# ── Summary row ────────────────────────────────────────────────────────────
total_rows = sum(t["row_count"] for t in tables)
total_cols = sum(len(t["columns"]) for t in tables)
tables_with_nulls = sum(
    1 for t in tables if any(c["null_count"] > 0 for c in t["columns"])
)

c1, c2, c3 = st.columns(3)
c1.metric("Total warehouse rows", f"{total_rows:,}")
c2.metric("Total columns", total_cols)
c3.metric("Tables with null values", tables_with_nulls)

st.markdown("---")

# ── Per-table panels ────────────────────────────────────────────────────────
table_names = [t["table_name"] for t in tables]
selected = st.selectbox("Select table to inspect", ["All tables"] + table_names)

tables_to_show = tables if selected == "All tables" else [t for t in tables if t["table_name"] == selected]

for table in tables_to_show:
    tname = table["table_name"]
    row_count = table["row_count"]
    cols = table["columns"]

    with st.container():
        st.markdown(f'<div class="dq-header">📋 {tname}</div>', unsafe_allow_html=True)
        col_left, col_right = st.columns([3, 2])

        with col_left:
            df = pd.DataFrame(
                [
                    {
                        "Column": c["column_name"],
                        "Type": c["dtype"],
                        "Null Count": c["null_count"],
                        "Null %": c["null_pct"],
                        "Distinct": c["distinct_count"],
                        "Min": c.get("min_val", ""),
                        "Max": c.get("max_val", ""),
                    }
                    for c in cols
                ]
            )

            # Color null % column
            def highlight_nulls(val):
                if isinstance(val, float):
                    if val > 50:
                        return "background-color: #fed7d7"
                    elif val > 10:
                        return "background-color: #fef3c7"
                return ""

            styled = df.style.applymap(highlight_nulls, subset=["Null %"])
            st.dataframe(styled, use_container_width=True, height=min(350, len(cols) * 38 + 40))

        with col_right:
            st.metric("Row count", f"{row_count:,}")
            st.metric("Columns", len(cols))

            null_cols = [c for c in cols if c["null_count"] > 0]
            if null_cols:
                fig = px.bar(
                    x=[c["column_name"] for c in null_cols],
                    y=[c["null_pct"] for c in null_cols],
                    labels={"x": "Column", "y": "Null %"},
                    title="Null Rate by Column",
                    color_discrete_sequence=["#f6ad55"],
                )
                fig.update_layout(
                    height=250,
                    margin=dict(l=10, r=10, t=40, b=40),
                    showlegend=False,
                    xaxis_tickangle=-30,
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.success("✓ No null values in this table")

        st.markdown("---")
