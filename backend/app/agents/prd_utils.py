"""PRD 字段值规范化工具。

LLM 返回的 confirmed 字段可能是 str / list / dict，下游 Agent 需统一处理。
"""
from __future__ import annotations

import re
from typing import Any


def as_text(value: Any) -> str:
    """将 PRD 字段值规范为字符串。"""
    if value is None:
        return ""
    if isinstance(value, list):
        parts = [as_text(v) for v in value]
        return ", ".join(p for p in parts if p)
    if isinstance(value, dict):
        parts = [f"{k}={as_text(v)}" for k, v in value.items()]
        return ", ".join(p for p in parts if p)
    return str(value).strip()


def split_items(value: Any) -> list[str]:
    """将 PRD 字段拆成条目列表（支持 list 或逗号分隔字符串）。"""
    if value is None:
        return []
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(split_items(item))
        return [p for p in out if p]
    text = as_text(value)
    if not text:
        return []
    return [p.strip() for p in re.split(r"[，,、/;；\n]+", text) if p.strip()]
