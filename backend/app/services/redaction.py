"""敏感信息脱敏（PRD 4.3）。

发送给外部 LLM 之前必须脱敏：手机号、身份证、邮箱、姓名、精确金额。
禁止发送：数据库账号、host、token、密钥、生产连接串、真实数据明细。
"""
from __future__ import annotations

import re
from typing import Any


_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"1[3-9]\d{9}"), "[REDACTED:PHONE]"),
    (re.compile(r"\b\d{17}[\dxX]\b"), "[REDACTED:IDCARD]"),
    (re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"), "[REDACTED:EMAIL]"),
    (re.compile(r"(?i)(password|passwd|pwd|token|secret|api[-_]?key)\s*[:=]\s*\S+"), r"\1=[REDACTED:SECRET]"),
    (re.compile(r"(?i)(host|hostname|server)\s*[:=]\s*[\w.-]+"), r"\1=[REDACTED:HOST]"),
    (re.compile(r"(?i)jdbc:[\w:/@.\-?=&]+"), "[REDACTED:CONN_STR]"),
    (re.compile(r"¥\s?\d+(?:\.\d+)?|\$\s?\d+(?:\.\d+)?"), "[REDACTED:AMOUNT]"),
]

_FORBIDDEN_PREFIX = ("DB_PASSWORD", "DB_HOST", "DB_USER", "JDBC_URL", "PROD_")


def redact_text(text: str) -> str:
    """对单段文本做脱敏。"""
    if not text:
        return text
    out = text
    for pat, repl in _PATTERNS:
        out = pat.sub(repl, out)
    return out


def is_forbidden(key: str) -> bool:
    return any(key.upper().startswith(p) for p in _FORBIDDEN_PREFIX)


def redact_payload(payload: Any) -> Any:
    """对结构化 payload 递归脱敏。"""
    if isinstance(payload, str):
        return redact_text(payload)
    if isinstance(payload, list):
        return [redact_payload(x) for x in payload]
    if isinstance(payload, dict):
        return {k: ("[REDACTED:FORBIDDEN]" if is_forbidden(k) else redact_payload(v)) for k, v in payload.items()}
    return payload
