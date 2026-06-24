"""Page 2: Query History — browse past queries with full SQL expansion."""
from __future__ import annotations

import os

import httpx
import pandas as pd
import streamlit as st

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(page_title="Query History · BI Copilot", page_icon="📜", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    .badge { display:inline-block; padding:2px 9px; border-radius:999px; font-size:.73rem; font-weight:600; }
    .safe-badge { background:#c6f6d5; color:#276749; }
    .unsafe-badge { background:#fed7d7; color:#9b2c2c; }
    .history-row {
        border:1px solid #e2e8f0; border-radius:8px; padding:.9rem 1rem;
        margin:.5rem 0; background:white;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.markdown("### 📜 Query History")
    limit = st.slider("Entries to show", 5, 100, 20)
    if st.button("🔄 Refresh"):
        st.rerun()

st.markdown("## 📜 Query History")
st.caption("All queries run through the NL Query or SQL Execute endpoints.")

try:
    resp = httpx.get(f"{API_BASE}/query/history?limit={limit}", timeout=10.0)
    resp.raise_for_status()
    data = resp.json()
except Exception as e:
    st.error(f"Could not fetch history: {e}")
    st.stop()

items = data.get("items", [])
total = data.get("total", 0)

if not items:
    st.info("No queries in history yet. Run a query from the NL Query page.")
    st.stop()

st.caption(f"Showing {len(items)} of {total} total queries")

# ── Summary stats ──────────────────────────────────────────────────────────
safe_count = sum(1 for i in items if i.get("is_safe"))
total_rows = sum(i.get("row_count") or 0 for i in items)
avg_ms_vals = [i.get("execution_time_ms") for i in items if i.get("execution_time_ms")]
avg_ms = round(sum(avg_ms_vals) / len(avg_ms_vals), 1) if avg_ms_vals else None

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total queries", total)
c2.metric("Safe executions", safe_count)
c3.metric("Total rows returned", f"{total_rows:,}")
c4.metric("Avg exec time", f"{avg_ms} ms" if avg_ms else "—")

st.markdown("---")

# ── Table view ──────────────────────────────────────────────────────────────
df = pd.DataFrame(items)
if "timestamp" in df.columns:
    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")

preview_cols = ["id", "timestamp", "question", "row_count", "execution_time_ms", "is_safe"]
display_df = df[[c for c in preview_cols if c in df.columns]].copy()
if "question" in display_df.columns:
    display_df["question"] = display_df["question"].fillna("(direct SQL)").str[:70]
if "execution_time_ms" in display_df.columns:
    display_df["execution_time_ms"] = display_df["execution_time_ms"].apply(
        lambda x: f"{x:.1f} ms" if x is not None else "—"
    )

st.dataframe(
    display_df,
    use_container_width=True,
    height=300,
    column_config={
        "is_safe": st.column_config.CheckboxColumn("Safe"),
        "execution_time_ms": "Exec Time",
    },
)

st.markdown("---")
st.markdown("### SQL Details")
st.caption("Expand a query to see the full SQL.")

for item in items[:20]:
    ts = str(item.get("timestamp", ""))[:19]
    q = item.get("question") or "(direct SQL execution)"
    is_safe = item.get("is_safe")
    rc = item.get("row_count", 0) or 0

    badge = (
        '<span class="badge safe-badge">✓ Safe</span>'
        if is_safe
        else '<span class="badge unsafe-badge">✗ Blocked</span>'
    )
    label = f"#{item['id']} · {ts} · {q[:50]}"

    with st.expander(label):
        col1, col2 = st.columns([1, 3])
        with col1:
            st.markdown(f"**Safety:** {badge}", unsafe_allow_html=True)
            st.markdown(f"**Rows:** {rc:,}")
            exec_t = item.get("execution_time_ms")
            if exec_t:
                st.markdown(f"**Time:** {exec_t:.1f} ms")
        with col2:
            st.code(item.get("sql", ""), language="sql")
