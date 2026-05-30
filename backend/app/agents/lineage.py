"""数据地图 Agent（PRD 3.1.5）。"""
from __future__ import annotations

from typing import Any

from app.services.dbt_repo import build_lineage, get_repo_snapshot


def generate(focus_unique_id: str | None = None) -> dict[str, Any]:
    snap = get_repo_snapshot()
    graph = build_lineage(snap, focus=focus_unique_id)
    upstream = sum(1 for e in graph["edges"] if e["target"] == focus_unique_id) if focus_unique_id else 0
    downstream = sum(1 for e in graph["edges"] if e["source"] == focus_unique_id) if focus_unique_id else 0
    return {
        "focus": focus_unique_id,
        "graph": graph,
        "upstream_count": upstream,
        "downstream_count": downstream,
        "covers": ["source", "staging", "intermediate", "marts", "metrics", "exposures"],
        "warnings": snap.warnings,
    }
