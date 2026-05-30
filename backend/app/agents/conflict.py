"""口径确认 Agent（PRD 3.1.7）。

检测：
- 同名不同口径
- 同口径不同命名
- 粒度冲突
- 时间窗口冲突
- 过滤条件冲突
- 维度定义冲突

只报告冲突 + 证据，不自动裁决。
"""
from __future__ import annotations

import re
from typing import Any

from app.agents.prd_utils import as_text, split_items
from app.services.dbt_repo import DbtRepoSnapshot, get_repo_snapshot

_TIME_PATTERNS = [r"\d+\s*[日天周月年]", r"interval\s+'?\d+", r"date_trunc\(['\"](?:day|week|month|year)"]


def _extract_time_windows(sql: str) -> list[str]:
    out: list[str] = []
    s = (sql or "").lower()
    for pat in _TIME_PATTERNS:
        out.extend(re.findall(pat, s))
    return out


def _extract_filters(sql: str) -> list[str]:
    if not sql:
        return []
    out: list[str] = []
    for m in re.finditer(r"where\s+(.+?)(?:group\s+by|order\s+by|limit|\Z)", sql, flags=re.IGNORECASE | re.DOTALL):
        clause = m.group(1).strip().splitlines()[0][:200]
        out.append(clause)
    return out


def detect(prd_confirmed: dict[str, Any], picked_asset_id: str | None = None) -> dict[str, Any]:
    snap: DbtRepoSnapshot = get_repo_snapshot()
    metric_name = as_text(prd_confirmed.get("metric_name"))
    prd_window = as_text(prd_confirmed.get("time_window"))
    prd_grain = as_text(prd_confirmed.get("grain"))
    prd_filter_items = split_items(prd_confirmed.get("filters"))

    conflicts: list[dict[str, Any]] = []
    name_buckets: dict[str, list[str]] = {}

    for uid, n in {**snap.models, **snap.metrics}.items():
        nm = n.name.lower()
        if metric_name:
            mn = metric_name.lower()
            tokens = re.findall(r"[a-z0-9_]+|[\u4e00-\u9fa5]+", mn)
            if any(t in nm for t in tokens if len(t) >= 2):
                tw = _extract_time_windows(n.raw_sql)
                if prd_window and tw and not any(prd_window in s for s in tw):
                    conflicts.append(
                        {
                            "type": "time_window",
                            "level": "high",
                            "asset": uid,
                            "message": f"命名相近但时间窗口不一致：PRD={prd_window!r}，资产证据={tw}",
                            "evidence": {"prd": prd_window, "asset": tw, "asset_file": n.file_path},
                        }
                    )
                fts = _extract_filters(n.raw_sql)
                if prd_filter_items and fts and not any(
                    any(t in f for t in prd_filter_items) for f in fts
                ):
                    conflicts.append(
                        {
                            "type": "filters",
                            "level": "medium",
                            "asset": uid,
                            "message": f"过滤条件可能差异：PRD={prd_filter_items!r}，资产 WHERE 子句={fts[:1]}",
                            "evidence": {"prd": prd_filter_items, "asset": fts[:1], "asset_file": n.file_path},
                        }
                    )
                if prd_grain and n.columns and prd_grain.lower() not in " ".join(n.columns.keys()).lower():
                    conflicts.append(
                        {
                            "type": "grain",
                            "level": "medium",
                            "asset": uid,
                            "message": f"粒度可能差异：PRD={prd_grain!r}，资产列={list(n.columns.keys())[:5]}",
                            "evidence": {"prd": prd_grain, "asset": list(n.columns.keys())[:5]},
                        }
                    )

        bucket_key = nm.replace("_", "")
        name_buckets.setdefault(bucket_key, []).append(uid)

    for k, uids in name_buckets.items():
        if len(uids) > 1:
            conflicts.append(
                {
                    "type": "naming",
                    "level": "low",
                    "asset": uids[0],
                    "message": f"检测到同名/近名资产：{uids}",
                    "evidence": {"assets": uids},
                }
            )

    high = sum(1 for c in conflicts if c["level"] == "high")
    medium = sum(1 for c in conflicts if c["level"] == "medium")
    return {
        "conflicts": conflicts,
        "conflict_count": len(conflicts),
        "high_count": high,
        "medium_count": medium,
        "blocked": high > 0,
        "compliance_note": (
            "AI 仅报告冲突与证据，不自动裁决；需由分析师或数开人工确认。"
        ),
    }
