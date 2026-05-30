"""需求澄清 Agent（PRD 3.1.2）。

- 基于固定字段 + 风险判断 + 最多 3 轮追问机制补齐需求。
- 输出结构化 PRD 草稿。
"""
from __future__ import annotations

import logging
import re
from typing import Any

from app.services.llm import chat_json

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = [
    {"key": "metric_name", "label": "指标名称", "hint": "例：用户 7 日留存率"},
    {"key": "business_goal", "label": "业务目标", "hint": "用于哪个业务/报表/决策"},
    {"key": "definition", "label": "指标口径定义", "hint": "如何计算？分子分母？事件粒度？"},
    {"key": "time_window", "label": "时间窗口", "hint": "计算窗口、回溯窗口、统计周期"},
    {"key": "grain", "label": "数据粒度", "hint": "用户/订单/会话；天/周/月"},
    {"key": "dimensions", "label": "分析维度", "hint": "渠道、版本、注册日期等"},
    {"key": "filters", "label": "过滤条件", "hint": "排除测试账号/内部员工/异常值等"},
    {"key": "acceptance", "label": "验收标准", "hint": "数值范围、对照基准、可接受偏差"},
]

_HINT_PATTERNS = {
    "metric_name": [r"指标|留存|活跃|GMV|转化|UV|PV|DAU|MAU|订单|交易"],
    "business_goal": [r"日报|周报|看板|报表|增长|运营|分析|决策"],
    "time_window": [r"日|周|月|7\s*日|30\s*日|留存|滚动|窗口|分区"],
    "grain": [r"用户|订单|会话|事件|按.*日|按.*周|粒度"],
    "dimensions": [r"按|渠道|版本|平台|地区|城市|分.*维度"],
    "filters": [r"排除|不包含|过滤|去掉|剔除|测试账号|内部员工|黑名单|白名单"],
}


def _heuristic_extract(text: str) -> dict[str, str]:
    """无 LLM 时的启发式抽取，给字段一个粗粒度初值。"""
    confirmed: dict[str, str] = {}
    if not text:
        return confirmed
    for field in REQUIRED_FIELDS:
        key = field["key"]
        if key not in _HINT_PATTERNS:
            continue
        for pat in _HINT_PATTERNS[key]:
            m = re.search(pat, text)
            if m:
                start = max(0, m.start() - 15)
                end = min(len(text), m.end() + 25)
                snippet = text[start:end].strip()
                confirmed[key] = snippet
                break
    return confirmed


def analyze(raw_text: str, prior_answers: dict[str, str] | None = None) -> dict[str, Any]:
    """返回：confirmed / pending / questions / risks。"""
    prior_answers = prior_answers or {}

    logger.info(
        "[clarify] analyze start raw_text_len=%d prior_answer_keys=%s",
        len(raw_text or ""),
        list(prior_answers.keys()),
    )
    llm_out = chat_json(
        system=(
            "你是一名资深数据分析师，正在帮助用户澄清数据开发需求。"
            "请基于业务目标、指标口径、时间窗口、粒度、维度、过滤条件、验收标准等字段判断需求是否完整。"
            "返回 JSON: {confirmed: {field: value}, pending: [field], questions: [{field, question, hint}], risks: [string]}。"
            "字段范围严格使用：metric_name, business_goal, definition, time_window, grain, dimensions, filters, acceptance。"
            "questions 数量 <= 3，仅针对 pending 字段。"
        ),
        user={"raw_text": raw_text, "prior_answers": prior_answers},
        caller="clarify.analyze",
    )

    if llm_out is None:
        logger.warning("[clarify] fallback to heuristic (LLM unavailable or parse failed)")
        confirmed = {**_heuristic_extract(raw_text), **{k: v for k, v in prior_answers.items() if v}}
        pending = [f["key"] for f in REQUIRED_FIELDS if f["key"] not in confirmed]
        questions = []
        for f in REQUIRED_FIELDS:
            if f["key"] in pending:
                questions.append(
                    {
                        "field": f["key"],
                        "question": f"请补充：{f['label']}",
                        "hint": f["hint"],
                    }
                )
            if len(questions) >= 3:
                break
        risks = []
        if "filters" in pending:
            risks.append("尚未明确过滤条件，可能导致测试账号/内部员工进入指标分母。")
        if "time_window" in pending:
            risks.append("尚未明确时间窗口，可能导致同名指标口径不一致。")
        logger.info(
            "[clarify] analyze done source=heuristic confirmed=%d pending=%d questions=%d risks=%d",
            len(confirmed),
            len(pending),
            len(questions),
            len(risks),
        )
        return {
            "confirmed": confirmed,
            "pending": pending,
            "questions": questions,
            "risks": risks,
            "source": "heuristic",
        }

    llm_out["source"] = "llm"
    llm_out.setdefault("risks", [])
    llm_out.setdefault("questions", [])
    llm_out.setdefault("confirmed", {})
    llm_out.setdefault("pending", [f["key"] for f in REQUIRED_FIELDS if f["key"] not in llm_out["confirmed"]])
    llm_out["questions"] = llm_out["questions"][:3]
    logger.info(
        "[clarify] analyze done source=llm confirmed=%d pending=%d questions=%d risks=%d",
        len(llm_out["confirmed"]),
        len(llm_out["pending"]),
        len(llm_out["questions"]),
        len(llm_out["risks"]),
    )
    return llm_out


def render_prd(requirement_id: str, raw_text: str, confirmed: dict[str, str], pending: list[str], risks: list[str]) -> dict[str, Any]:
    """生成结构化分析师 PRD（PRD 3.1.2）。"""
    field_label = {f["key"]: f["label"] for f in REQUIRED_FIELDS}

    sections = []
    for f in REQUIRED_FIELDS:
        v = confirmed.get(f["key"])
        if v:
            sections.append({"key": f["key"], "label": f["label"], "value": v, "status": "confirmed"})
        else:
            sections.append(
                {
                    "key": f["key"],
                    "label": f["label"],
                    "value": "",
                    "status": "pending",
                    "hint": f["hint"],
                }
            )

    md_lines = [
        f"# 数据开发需求 PRD",
        "",
        f"- 需求 ID：`{requirement_id}`",
        f"- 原始描述：{raw_text}",
        "",
        "## 1. 需求字段",
        "",
    ]
    for s in sections:
        if s["status"] == "confirmed":
            md_lines.append(f"- **{s['label']}**：{s['value']}")
        else:
            md_lines.append(f"- **{s['label']}**：_待确认_（{s.get('hint', '')}）")
    md_lines += ["", "## 2. 风险与待确认项", ""]
    if risks:
        md_lines += [f"- {r}" for r in risks]
    else:
        md_lines.append("- 无明显风险。")
    md_lines += [
        "",
        "## 3. 合规声明",
        "",
        "> AI 生成内容仅用于辅助分析和开发，需由数据分析师或数据开发工程师确认后使用。"
        "系统不会自动上线生产、自动 merge 或自动裁决指标口径。",
    ]

    return {
        "sections": sections,
        "pending": pending,
        "confirmed_count": sum(1 for s in sections if s["status"] == "confirmed"),
        "pending_count": sum(1 for s in sections if s["status"] == "pending"),
        "field_label": field_label,
        "markdown": "\n".join(md_lines),
    }
