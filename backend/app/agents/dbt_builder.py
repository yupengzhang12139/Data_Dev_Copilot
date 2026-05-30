"""数仓构建 Agent（PRD 3.1.8 - 3.1.11）。

- 按现有 dbt 项目模板生成 model SQL、schema.yml、基础 tests。
- 自动 SQL 优化（ref/source、增量、避免硬编码）。
- 推荐 Join Key（综合 dbt tests / catalog / 历史 join 模式 / 命名语义打分）。
- 输出文件预览（不写入磁盘，由 git_writer 统一负责）。
"""
from __future__ import annotations

import re
from typing import Any

from app.agents.prd_utils import as_text, split_items
from app.services.dbt_repo import DbtNode, DbtRepoSnapshot, get_repo_snapshot


_CN_KEYWORDS = {
    "留存": "retention",
    "活跃": "active",
    "新增": "new",
    "用户": "user",
    "订单": "order",
    "交易": "trade",
    "支付": "payment",
    "转化": "conversion",
    "渠道": "channel",
    "版本": "version",
    "日": "d",
    "周": "w",
    "月": "m",
    "指标": "metric",
    "事件": "event",
    "会话": "session",
    "登录": "login",
    "注册": "register",
}


def _slugify(text: str) -> str:
    s = text or ""
    for cn, en in _CN_KEYWORDS.items():
        s = s.replace(cn, f"_{en}_")
    s = re.sub(r"[^a-zA-Z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_").lower()
    if not s or s.isdigit() or len(s) < 2:
        import hashlib

        h = hashlib.md5((text or "").encode("utf-8")).hexdigest()[:8]
        s = f"new_metric_{h}"
    return s


def _infer_sources(prd: dict[str, Any], snap: DbtRepoSnapshot, picked_asset_ids: list[str]) -> list[DbtNode]:
    """优先基于已选历史资产反推 source / staging。"""
    out: list[DbtNode] = []
    for uid in picked_asset_ids:
        node = snap.models.get(uid) or snap.metrics.get(uid) or snap.exposures.get(uid)
        if not node:
            continue
        for dep_uid in node.depends_on:
            dep = snap.models.get(dep_uid) or snap.sources.get(dep_uid)
            if dep and dep not in out:
                out.append(dep)
    if not out:
        for n in snap.models.values():
            if n.layer == "staging":
                out.append(n)
        if not out:
            out = list(snap.sources.values())[:2]
    return out[:4]


def _recommend_join_keys(sources: list[DbtNode], snap: DbtRepoSnapshot) -> list[dict[str, Any]]:
    """综合 dbt tests / catalog / 命名语义打分（PRD 3.1.9）。"""
    candidates: dict[str, dict[str, Any]] = {}

    unique_cols: set[tuple[str, str]] = set()
    not_null_cols: set[tuple[str, str]] = set()
    for t in snap.tests:
        meta = t.get("test_metadata") or {}
        name = meta.get("name")
        kwargs = meta.get("kwargs") or {}
        col = kwargs.get("column_name")
        for d in t.get("depends_on", []):
            if not col:
                continue
            if name == "unique":
                unique_cols.add((d, col))
            elif name == "not_null":
                not_null_cols.add((d, col))

    for src in sources:
        for col_name, col_meta in (src.columns or {}).items():
            score = 0.0
            evidence: list[str] = []
            tests = col_meta.get("tests") or []
            if "unique" in tests or (src.unique_id, col_name) in unique_cols:
                score += 0.5
                evidence.append("dbt test: unique")
            if "not_null" in tests or (src.unique_id, col_name) in not_null_cols:
                score += 0.2
                evidence.append("dbt test: not_null")
            low = col_name.lower()
            if low.endswith("_id") or low in {"id", "user_id", "order_id", "session_id"}:
                score += 0.25
                evidence.append("命名语义：ID 列")
            if "date" in low or "time" in low or low.endswith("_dt"):
                score += 0.05
                evidence.append("命名语义：时间列，可能为分区键")
            if score <= 0:
                continue
            ck = col_name.lower()
            cur = candidates.setdefault(
                ck,
                {"column": col_name, "score": 0.0, "evidence": [], "tables": []},
            )
            cur["score"] += score
            cur["evidence"] = sorted(set(cur["evidence"] + evidence))
            cur["tables"].append(src.name)

    out = sorted(candidates.values(), key=lambda x: x["score"], reverse=True)
    for c in out:
        c["confidence"] = min(1.0, round(c["score"], 2))
        c.pop("score", None)
    return out[:5]


def generate(
    requirement_id: str,
    prd_confirmed: dict[str, Any],
    picked_asset_ids: list[str],
) -> dict[str, Any]:
    snap = get_repo_snapshot()
    metric_name = as_text(prd_confirmed.get("metric_name")) or "new_metric"
    model_name = f"fct_{_slugify(metric_name)}"
    sources = _infer_sources(prd_confirmed, snap, picked_asset_ids)
    join_keys = _recommend_join_keys(sources, snap)

    grain = as_text(prd_confirmed.get("grain")) or "user_id"
    time_window = as_text(prd_confirmed.get("time_window")) or "近 7 日"
    filters_raw = prd_confirmed.get("filters", "")
    dimensions_raw = prd_confirmed.get("dimensions", "")

    grain_col = _grain_to_column(grain)
    primary_key = (join_keys[0]["column"] if join_keys else grain_col)
    date_col = next(
        (jk["column"] for jk in join_keys if "date" in jk["column"].lower() or "time" in jk["column"].lower()),
        "event_date",
    )

    src_refs = []
    for s in sources:
        if s.resource_type == "source":
            src_refs.append(f"{{{{ source('{s.schema or 'raw'}', '{s.name}') }}}}")
        else:
            src_refs.append(f"{{{{ ref('{s.name}') }}}}")
    primary_src = src_refs[0] if src_refs else "{{ source('raw', 'events') }}"

    dim_cols = split_items(dimensions_raw)[:5]
    dim_cols_norm = [_slugify(d) for d in dim_cols] or ["channel", "platform"]

    where_clauses = []
    for piece in split_items(filters_raw):
        if "测试" in piece:
            where_clauses.append("is_test = false")
        elif "内部" in piece or "员工" in piece:
            where_clauses.append("is_internal = false")
        else:
            where_clauses.append(f"-- TODO: 转译过滤条件: {piece}")
    where_block = "\n        and ".join(where_clauses) if where_clauses else "1 = 1"

    model_sql = f"""{{{{
  config(
    materialized = 'incremental',
    unique_key = '{primary_key}',
    on_schema_change = 'sync_all_columns'
  )
}}}}

with base as (
    select
        {primary_key},
        {date_col},
        {", ".join(dim_cols_norm)}
    from {primary_src}
    where {where_block}
        {{% if is_incremental() %}}
        and {date_col} >= (select coalesce(max({date_col}), '1970-01-01') from {{{{ this }}}})
        {{% endif %}}
)

select
    {primary_key},
    {date_col},
    {", ".join(dim_cols_norm)},
    -- TODO: 根据口径补充计算逻辑（{metric_name}，时间窗口：{time_window}）
    1 as metric_value
from base
"""

    schema_yml = _render_schema_yml(model_name, primary_key, date_col, dim_cols_norm, metric_name)
    tests = _render_tests(model_name, primary_key, dim_cols_norm)
    optimizations = [
        "使用 ref/source 引用，避免硬编码 schema/table。",
        "incremental 模型 + on_schema_change=sync_all_columns。",
        "{{ is_incremental() }} 中过滤增量水位，避免全表回扫。",
        "保留 -- TODO 标记，强制人工补齐口径。",
    ]

    files = [
        {
            "path": f"models/marts/{model_name}.sql",
            "content": model_sql,
            "kind": "model",
        },
        {
            "path": f"models/marts/{model_name}.yml",
            "content": schema_yml,
            "kind": "schema",
        },
    ]

    return {
        "model_name": model_name,
        "files": files,
        "tests": tests,
        "join_keys": join_keys,
        "sources": [s.to_dict() for s in sources],
        "optimizations": optimizations,
        "compliance_note": (
            "AI 生成内容仅用于辅助分析和开发，需由数据分析师或数据开发工程师确认后使用。"
            "系统不会自动上线生产、自动 merge 或自动裁决指标口径。"
        ),
    }


def _grain_to_column(grain: str) -> str:
    g = (grain or "").lower()
    if "订单" in g or "order" in g:
        return "order_id"
    if "会话" in g or "session" in g:
        return "session_id"
    if "事件" in g or "event" in g:
        return "event_id"
    return "user_id"


def _render_schema_yml(model: str, pk: str, date_col: str, dims: list[str], metric: str) -> str:
    dim_block = "\n".join([f"      - name: {d}" for d in dims])
    return f"""version: 2

models:
  - name: {model}
    description: |
      {metric}（由 Data Dev Copilot 生成草稿，待人工 Review 后上线）
    columns:
      - name: {pk}
        description: 主键列
        tests:
          - not_null
          - unique
      - name: {date_col}
        description: 业务时间列 / 分区列
        tests:
          - not_null
{dim_block}
      - name: metric_value
        description: 指标值
        tests:
          - not_null
"""


def _render_tests(model: str, pk: str, dims: list[str]) -> list[dict[str, str]]:
    out = [
        {"type": "not_null", "model": model, "column": pk},
        {"type": "unique", "model": model, "column": pk},
        {"type": "not_null", "model": model, "column": "metric_value"},
    ]
    for d in dims:
        out.append({"type": "not_null", "model": model, "column": d})
    return out
