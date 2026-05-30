"""历史指标关联 Agent（PRD 3.1.4）。

- 在 dbt 仓库中检索相似 model / metric / exposure。
- 输出推荐理由 + 差异对比 + 风险提示。
"""
from __future__ import annotations

import re
from typing import Any

from app.agents.prd_utils import as_text
from app.services.dbt_repo import DbtNode, DbtRepoSnapshot, get_repo_snapshot

_STOPWORDS = {"的", "了", "和", "与", "或", "及"}


def _tokenize(text: str) -> set[str]:
    text = (text or "").lower()
    tokens = set(re.findall(r"[a-z0-9_]+", text))
    cn_tokens = re.findall(r"[\u4e00-\u9fa5]+", text)
    for t in cn_tokens:
        for i in range(0, len(t) - 1):
            tokens.add(t[i : i + 2])
    return {t for t in tokens if t and t not in _STOPWORDS}


def _score(asset_text: str, query_tokens: set[str]) -> tuple[float, list[str]]:
    asset_tokens = _tokenize(asset_text)
    overlap = asset_tokens & query_tokens
    if not query_tokens:
        return 0.0, []
    score = len(overlap) / max(1, len(query_tokens))
    return score, sorted(overlap)


def recommend(prd_confirmed: dict[str, Any]) -> dict[str, Any]:
    snap: DbtRepoSnapshot = get_repo_snapshot()
    query_text = " ".join([as_text(v) for v in prd_confirmed.values() if v])
    query_tokens = _tokenize(query_text)

    candidates: list[dict[str, Any]] = []
    for n in snap.all_assets():
        text = " ".join(
            [
                n.name,
                n.description,
                " ".join(n.tags or []),
                " ".join(list((n.columns or {}).keys())),
            ]
        )
        score, hits = _score(text, query_tokens)
        if score <= 0:
            continue
        diff = _compute_diff(prd_confirmed, n)
        candidates.append(
            {
                "unique_id": n.unique_id,
                "name": n.name,
                "resource_type": n.resource_type,
                "layer": n.layer,
                "description": n.description,
                "score": round(score, 3),
                "matched_tokens": hits,
                "columns": list((n.columns or {}).keys())[:20],
                "file_path": n.file_path,
                "diff": diff,
                "risks": _risks(diff),
                "reason": _reason(n, hits),
            }
        )

    candidates.sort(key=lambda x: x["score"], reverse=True)
    top = candidates[:5]
    return {
        "candidates": top,
        "candidate_count": len(top),
        "scanned": {
            "model_count": len(snap.models),
            "metric_count": len(snap.metrics),
            "exposure_count": len(snap.exposures),
        },
        "warnings": snap.warnings,
    }


def _compute_diff(prd: dict[str, Any], n: DbtNode) -> dict[str, Any]:
    diff: dict[str, Any] = {}
    if prd.get("time_window"):
        diff["time_window"] = {
            "prd": as_text(prd["time_window"]),
            "asset": _scan(n.raw_sql, ["window", "interval", "between", "date_trunc", "rolling"]) or "未知",
        }
    if prd.get("grain"):
        diff["grain"] = {
            "prd": as_text(prd["grain"]),
            "asset": ", ".join(list((n.columns or {}).keys())[:5]) or "未知",
        }
    if prd.get("filters"):
        diff["filters"] = {
            "prd": as_text(prd["filters"]),
            "asset": _scan(n.raw_sql, ["where", "filter", "exclude"]) or "未知",
        }
    return diff


def _risks(diff: dict[str, Any]) -> list[str]:
    risks: list[str] = []
    for key, label in [
        ("time_window", "时间窗口"),
        ("grain", "数据粒度"),
        ("filters", "过滤条件"),
    ]:
        v = diff.get(key)
        if not v:
            continue
        prd_text = as_text(v.get("prd"))
        asset_text = as_text(v.get("asset"))
        if prd_text and asset_text and asset_text != "未知" and prd_text not in asset_text:
            risks.append(f"{label}差异：PRD={prd_text!r}，历史资产={asset_text!r}")
    return risks


def _scan(sql: str, keywords: list[str]) -> str:
    if not sql:
        return ""
    low = sql.lower()
    for kw in keywords:
        idx = low.find(kw)
        if idx >= 0:
            return sql[idx : min(len(sql), idx + 80)].strip()
    return ""


def _reason(n: DbtNode, hits: list[str]) -> str:
    parts = []
    if n.resource_type == "metric":
        parts.append("命中 dbt metric 定义")
    if n.layer in {"marts", "intermediate"}:
        parts.append(f"位于 {n.layer} 层，可能为下游消费层模型")
    if hits:
        parts.append(f"关键词命中：{', '.join(hits[:5])}")
    return "；".join(parts) or "命名/描述与需求文本相关"
