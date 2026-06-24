"""Page 1: Natural Language Query — the core demo page."""
from __future__ import annotations

import json
import os

import httpx
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(page_title="NL Query · BI Copilot", page_icon="💬", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    .sql-box { background:#1e293b; border-radius:8px; padding:1rem; margin:.5rem 0; }
    .badge { display:inline-block; padding:3px 12px; border-radius:999px; font-size:.75rem; font-weight:600; }
    .badge-safe { background:#c6f6d5; color:#276749; }
    .badge-unsafe { background:#fed7d7; color:#9b2c2c; }
    .badge-warn { background:#fef3c7; color:#92400e; }
    .metric-pill {
        background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;
        padding:.6rem 1rem; text-align:center;
    }
    .metric-pill .v { font-size:1.4rem; font-weight:700; color:#1e40af; }
    .metric-pill .l { font-size:.75rem; color:#64748b; margin-top:.1rem; }
    .section-header { font-size:1rem; font-weight:600; color:#1e3a5f; margin:.8rem 0 .4rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Sidebar ─────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 💬 NL Query")
    st.caption("Ask questions about the retail warehouse in plain language.")
    st.markdown("---")
    st.markdown("**Example questions:**")

    EXAMPLES = [
        "Show me top 10 customers by revenue",
        "What is the total revenue by month?",
        "Show me the daily sales trend",
        "Revenue breakdown by product category",
        "Average product rating per category",
        "Order count breakdown by status",
        "List all customers",
        "Best-selling products by quantity",
    ]
    selected_example = st.selectbox("Pick an example", [""] + EXAMPLES)

    st.markdown("---")
    max_rows = st.slider("Max rows", min_value=10, max_value=2000, value=100, step=10)
    st.markdown("---")
    st.markdown("**SQL Guardrail status:**")
    st.markdown(
        '<span class="badge badge-safe">✓ Active</span> — DROP, DELETE, UPDATE, INSERT blocked',
        unsafe_allow_html=True,
    )

# ── Main area ────────────────────────────────────────────────────────────────
st.markdown("## 💬 Natural Language Query")
st.caption("Type a question in English or Chinese. The system will generate SQL, validate it, and execute it.")

# Pre-fill with example if selected
default_q = selected_example if selected_example else ""
question = st.text_area(
    "Your question",
    value=default_q,
    height=80,
    placeholder='e.g. "Show me top 10 customers by revenue"',
)

run_col, _ = st.columns([1, 5])
with run_col:
    run = st.button("▶ Run Query", type="primary", use_container_width=True)

if run and question.strip():
    with st.spinner("Generating SQL and executing query..."):
        try:
            resp = httpx.post(
                f"{API_BASE}/query/nl",
                json={"question": question, "max_rows": max_rows},
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            st.error(f"API error: {e}")
            st.stop()

    # Store in session
    st.session_state["last_result"] = data

if "last_result" in st.session_state:
    data = st.session_state["last_result"]

    sql = data.get("sql", "")
    is_safe = data.get("is_safe", False)
    issues = data.get("safety_issues", [])
    rows = data.get("rows", [])
    columns = data.get("columns", [])
    row_count = data.get("row_count", 0)
    exec_ms = data.get("execution_time_ms")
    chart_rec = data.get("chart_recommendation")
    error = data.get("error")

    # ── Metrics strip ──
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        badge = (
            '<span class="badge badge-safe">✓ Safe</span>'
            if is_safe
            else '<span class="badge badge-unsafe">✗ Blocked</span>'
        )
        st.markdown(
            f'<div class="metric-pill"><div class="v">{badge}</div>'
            '<div class="l">SQL Safety</div></div>',
            unsafe_allow_html=True,
        )
    with m2:
        st.markdown(
            f'<div class="metric-pill"><div class="v">{row_count:,}</div>'
            '<div class="l">Rows returned</div></div>',
            unsafe_allow_html=True,
        )
    with m3:
        t_str = f"{exec_ms:.1f} ms" if exec_ms else "—"
        st.markdown(
            f'<div class="metric-pill"><div class="v">{t_str}</div>'
            '<div class="l">Execution time</div></div>',
            unsafe_allow_html=True,
        )
    with m4:
        ct = chart_rec.get("chart_type", "table").upper() if chart_rec else "—"
        st.markdown(
            f'<div class="metric-pill"><div class="v">{ct}</div>'
            '<div class="l">Chart type</div></div>',
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Two-column layout: SQL | Chart ──
    left_col, right_col = st.columns([3, 2])

    with left_col:
        st.markdown('<div class="section-header">Generated SQL</div>', unsafe_allow_html=True)
        st.code(sql, language="sql")

        if not is_safe:
            st.error(f"**Safety blocked:** {'; '.join(issues) if issues else error}")
        elif error:
            st.warning(f"⚠️ Execution error: {error}")

        if rows:
            st.markdown('<div class="section-header">Query Results</div>', unsafe_allow_html=True)
            df = pd.DataFrame(rows, columns=columns)
            st.dataframe(df, use_container_width=True, height=min(400, max(200, len(df) * 35 + 40)))

    with right_col:
        if chart_rec and rows:
            st.markdown('<div class="section-header">Chart Recommendation</div>', unsafe_allow_html=True)
            ct = chart_rec.get("chart_type", "table")
            x = chart_rec.get("x_col")
            y = chart_rec.get("y_col")
            y_cols = chart_rec.get("y_cols")
            color = chart_rec.get("color_col")
            reasoning = chart_rec.get("reasoning", "")

            df = pd.DataFrame(rows, columns=columns)

            fig = None
            try:
                if ct == "line" and x and y and x in df.columns and y in df.columns:
                    fig = px.line(df, x=x, y=y, markers=True,
                                  color_discrete_sequence=["#2d6a9f"])
                elif ct == "multi_line" and x and y_cols:
                    valid_y = [c for c in (y_cols or []) if c in df.columns]
                    if valid_y and x in df.columns:
                        fig = px.line(df, x=x, y=valid_y, markers=True)
                elif ct == "bar" and x and y and y in df.columns and x in df.columns:
                    fig = px.bar(df, x=x, y=y, orientation="h",
                                 color_discrete_sequence=["#2d6a9f"])
                elif ct == "heatmap" and x and y and color:
                    if all(c in df.columns for c in [x, y, color]):
                        fig = px.density_heatmap(df, x=x, y=y, z=color)
                elif ct == "histogram" and x and x in df.columns:
                    fig = px.histogram(df, x=x, color_discrete_sequence=["#2d6a9f"])
            except Exception:
                pass

            if fig:
                fig.update_layout(
                    height=380,
                    margin=dict(l=20, r=20, t=30, b=30),
                    paper_bgcolor="white",
                    plot_bgcolor="#f8fafc",
                    font=dict(family="Inter", size=12),
                )
                st.plotly_chart(fig, use_container_width=True)
                if reasoning:
                    st.caption(f"💡 {reasoning}")
            else:
                st.info(f"Chart type: **{ct}** — showing as table")
                st.dataframe(df, use_container_width=True)
        elif not rows and is_safe:
            st.info("No results to display.")

elif run and not question.strip():
    st.warning("Please enter a question.")
