"""Page 4: Metadata Explorer — browse table schemas and catalog descriptions."""
from __future__ import annotations

import os

import httpx
import pandas as pd
import streamlit as st

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(page_title="Metadata Explorer · BI Copilot", page_icon="📋", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    .tag {
        display: inline-block; background: #eff6ff; color: #1e40af;
        border: 1px solid #bfdbfe; border-radius: 4px;
        padding: 1px 7px; font-size: .72rem; margin: 2px;
    }
    .tag-metric  { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
    .tag-date    { background:#fdf4ff; color:#7e22ce; border-color:#e9d5ff; }
    .tag-id      { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
    .tag-pii     { background:#fef2f2; color:#991b1b; border-color:#fecaca; }
    .sample-pill {
        display:inline-block; background:#f8fafc; border:1px solid #e2e8f0;
        border-radius:4px; padding:1px 8px; font-size:.75rem; margin:2px;
        font-family:monospace; color:#374151;
    }
    .rel-row { background:#f0f9ff; border-left:3px solid #2d6a9f; padding:.4rem .8rem; margin:.3rem 0; border-radius:0 4px 4px 0; font-size:.85rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Load tables list ──────────────────────────────────────────────────────
try:
    resp = httpx.get(f"{API_BASE}/metadata/tables", timeout=10.0)
    resp.raise_for_status()
    tables_list = resp.json()
except Exception as e:
    st.error(f"Cannot load metadata: {e}")
    st.stop()

table_names = [t["name"] for t in tables_list]

# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 📋 Schema Explorer")
    selected_table = st.selectbox("Select a table", table_names)
    st.markdown("---")
    if tables_list:
        st.markdown("**Warehouse overview:**")
        for t in tables_list:
            n_approx = t.get("row_count_approx")
            n_str = f"~{n_approx:,}" if n_approx else "?"
            st.caption(f"**{t['name']}** · {n_str} rows · {t['column_count']} cols")

# ── Main area ────────────────────────────────────────────────────────────────
st.markdown("## 📋 Metadata Explorer")

# Overview card
overview_df = pd.DataFrame(
    [
        {
            "Table": t["name"],
            "Approx Rows": f"~{t['row_count_approx']:,}" if t.get("row_count_approx") else "?",
            "Columns": t["column_count"],
            "Description": t["description"][:80] + "…" if len(t["description"]) > 80 else t["description"],
        }
        for t in tables_list
    ]
)
st.dataframe(overview_df, use_container_width=True, height=240)

st.markdown("---")

# ── Table detail ─────────────────────────────────────────────────────────────
if selected_table:
    try:
        resp = httpx.get(f"{API_BASE}/metadata/tables/{selected_table}", timeout=10.0)
        resp.raise_for_status()
        detail = resp.json()
    except Exception as e:
        st.error(f"Could not load details for {selected_table}: {e}")
        st.stop()

    st.markdown(f"### 📄 {detail['name']}")
    st.info(detail["description"])

    col_a, col_b = st.columns([1, 2])
    with col_a:
        st.markdown(f"**Primary key:** `{detail['primary_key']}`")
        n = detail.get("row_count_approx")
        st.markdown(f"**Approx rows:** {f'~{n:,}' if n else '?'}")
        st.markdown(f"**Columns:** {len(detail['columns'])}")

    with col_b:
        rels = detail.get("relationships", [])
        if rels:
            st.markdown("**Relationships:**")
            for r in rels:
                st.markdown(
                    f'<div class="rel-row">🔗 <code>{r["column"]}</code> → '
                    f'<code>{r["references"]}</code> '
                    f'<span style="color:#64748b">({r["type"]})</span></div>',
                    unsafe_allow_html=True,
                )

    st.markdown("#### Columns")

    _TAG_COLOR_MAP = {
        "metric": "tag-metric",
        "date": "tag-date",
        "id": "tag-id",
        "pii": "tag-pii",
    }

    for col in detail["columns"]:
        with st.container():
            row_left, row_right = st.columns([2, 3])
            with row_left:
                st.markdown(f"**`{col['name']}`**  ·  `{col['dtype']}`")
                tags_html = " ".join(
                    f'<span class="tag {_TAG_COLOR_MAP.get(t, "")}">{t}</span>'
                    for t in col.get("semantic_tags", [])
                )
                if tags_html:
                    st.markdown(tags_html, unsafe_allow_html=True)
            with row_right:
                st.caption(col.get("description", ""))
                samples = col.get("sample_values", [])
                if samples:
                    pills = " ".join(
                        f'<span class="sample-pill">{str(s)[:20]}</span>'
                        for s in samples[:5]
                        if s is not None
                    )
                    st.markdown(f"**Samples:** {pills}", unsafe_allow_html=True)
        st.markdown('<hr style="border:none;border-top:1px solid #f1f5f9;margin:.3rem 0">', unsafe_allow_html=True)

    # ── Data preview ──────────────────────────────────────────────────────────
    with st.expander(f"👁  Preview first 5 rows of `{selected_table}`"):
        try:
            resp2 = httpx.post(
                f"{API_BASE}/query/sql/execute",
                json={"sql": f"SELECT * FROM {selected_table} LIMIT 5", "max_rows": 5},
                timeout=10.0,
            )
            resp2.raise_for_status()
            res = resp2.json()
            if res.get("error"):
                st.warning(res["error"])
            elif res.get("rows"):
                st.dataframe(
                    pd.DataFrame(res["rows"], columns=res["columns"]),
                    use_container_width=True,
                )
        except Exception as e:
            st.warning(f"Preview failed: {e}")
