"""验数 SQL Diff Agent + Root Cause Agent + 上线建议（PRD 3.1.12 - 3.1.15）。"""
from __future__ import annotations

import random
from typing import Any

from app.services.dbt_repo import get_repo_snapshot


def generate_diff_sql(prd_confirmed: dict[str, str], picked_asset_ids: list[str], new_model_name: str) -> dict[str, Any]:
    snap = get_repo_snapshot()
    base_uid = picked_asset_ids[0] if picked_asset_ids else None
    base = snap.models.get(base_uid) if base_uid else None
    base_ref = f"{{{{ ref('{base.name}') }}}}" if base else "-- 未匹配到对照基准，需人工指定"

    sql = f"""-- 验数 SQL（由 Data Dev Copilot 生成）
-- 对照基准：{base.name if base else 'N/A'}
-- 新模型：{new_model_name}

with new_data as (
    select count(*) as new_cnt, sum(metric_value) as new_sum from {{{{ ref('{new_model_name}') }}}}
),
base_data as (
    select count(*) as base_cnt, sum(metric_value) as base_sum from {base_ref}
)
select
    new_cnt,
    base_cnt,
    new_cnt - base_cnt as cnt_diff,
    case when base_cnt = 0 then null else (new_cnt - base_cnt) * 1.0 / base_cnt end as cnt_diff_rate,
    new_sum,
    base_sum,
    new_sum - base_sum as sum_diff
from new_data, base_data
"""
    return {
        "diff_sql": sql,
        "baseline_asset": base.name if base else None,
        "compliance_note": (
            "验数 SQL 仅用于辅助 Review；执行结果需由数开/分析师人工确认。"
        ),
    }


def run_dbt_validation(model_name: str) -> dict[str, Any]:
    """演示用：模拟 dbt build/test 执行结果。

    在生产环境应调用 dbt build --select <model> 并解析 run_results.json；
    MVP 阶段为保证零环境依赖，使用模拟器（仍输出真实结构）。
    """
    rng = random.Random(model_name)
    failed = rng.random() < 0.15
    return {
        "status": "fail" if failed else "pass",
        "summary": {
            "model_runs": 1,
            "test_runs": 4,
            "failed_node_count": 1 if failed else 0,
        },
        "details": [
            {"node": model_name, "type": "model", "status": "success", "elapsed_seconds": 4.2},
            {"node": f"unique_{model_name}_id", "type": "test", "status": "success", "elapsed_seconds": 0.8},
            {"node": f"not_null_{model_name}_id", "type": "test", "status": "success", "elapsed_seconds": 0.3},
            {
                "node": f"not_null_{model_name}_metric_value",
                "type": "test",
                "status": "fail" if failed else "success",
                "elapsed_seconds": 0.4,
                "message": "10 rows have null metric_value" if failed else "",
            },
            {"node": f"relationships_{model_name}_user_id", "type": "test", "status": "success", "elapsed_seconds": 0.6},
        ],
        "warnings": ["演示模式下使用模拟执行结果；接通真实数仓后请改用 dbt build --select。"],
    }


def run_diff(diff_sql: str) -> dict[str, Any]:
    rng = random.Random(diff_sql)
    cnt_diff_rate = round(rng.uniform(-0.05, 0.05), 4)
    diff_level = "high" if abs(cnt_diff_rate) > 0.1 else "medium" if abs(cnt_diff_rate) > 0.03 else "low"
    return {
        "status": "pass" if diff_level == "low" else "warn",
        "diff_level": diff_level,
        "metrics": {
            "new_cnt": 12345 + rng.randint(0, 100),
            "base_cnt": 12345,
            "cnt_diff_rate": cnt_diff_rate,
            "new_sum": 67890 + rng.randint(0, 200),
            "base_sum": 67890,
        },
    }


def root_cause(validation: dict[str, Any], diff: dict[str, Any]) -> dict[str, Any]:
    causes: list[dict[str, Any]] = []
    for d in validation.get("details", []):
        if d.get("status") == "fail":
            causes.append(
                {
                    "node": d["node"],
                    "type": d["type"],
                    "hypothesis": "存在 NULL 值或字段缺失，可能是上游 source 字段命名变更或过滤条件未覆盖。",
                    "evidence": [d.get("message", ""), "manifest 中该列声明 not_null"],
                    "next_step": "检查上游 source schema 与过滤条件，必要时调整 PRD 与 model SQL。",
                }
            )
    if diff.get("diff_level") in {"medium", "high"}:
        causes.append(
            {
                "node": "sql_diff",
                "type": "diff",
                "hypothesis": f"与对照基准存在 {diff['diff_level']} 级差异，可能是粒度/时间窗口/过滤条件差异导致。",
                "evidence": [str(diff.get("metrics", {}))],
                "next_step": "复核 PRD 时间窗口与过滤条件，必要时人工裁决口径。",
            }
        )
    return {
        "causes": causes,
        "cause_count": len(causes),
        "compliance_note": "Root Cause 分析仅基于 dbt manifest/catalog 静态信息，不分析埋点与生产数据明细。",
    }


def release_advice(
    validation: dict[str, Any],
    diff: dict[str, Any],
    conflicts: dict[str, Any],
    warehouse_available: bool = True,
) -> dict[str, Any]:
    reasons: list[str] = []
    advice = "建议上线"

    if conflicts.get("blocked"):
        advice = "需人工确认"
        reasons.append("存在高风险口径冲突，按 PRD 4.3 不允许 AI 自动裁决。")
    if validation.get("status") == "fail":
        advice = "不建议上线"
        reasons.append(f"dbt build/test 失败：{validation['summary']['failed_node_count']} 节点未通过。")
    if diff.get("diff_level") == "high":
        advice = "不建议上线"
        reasons.append("SQL Diff 差异等级 high，与对照基准偏离过大。")
    elif diff.get("diff_level") == "medium" and advice == "建议上线":
        advice = "需人工确认"
        reasons.append("SQL Diff 差异等级 medium，建议人工 Review。")
    if not warehouse_available:
        advice = "需人工确认"
        reasons.append("开发/测试环境数仓不可用，未运行真实验证。")

    if not reasons:
        reasons.append("dbt build/test 全部通过，SQL Diff 差异在低风险阈值内。")

    return {
        "advice": advice,
        "reasons": reasons,
        "compliance_note": (
            "AI 生成内容仅用于辅助分析和开发，需由数据分析师或数据开发工程师确认后使用。"
            "系统不会自动上线生产、自动 merge 或自动裁决指标口径。"
        ),
    }
