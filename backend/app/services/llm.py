"""LLM 适配层。

- 默认使用 OpenAI 兼容协议（支持 OpenAI / DeepSeek / Qwen / 通义 / 自建）。
- 未配置 API_KEY 时降级为 None；上层 Agent 会自动走启发式实现，保证流程完整。
- 所有外发内容必须先经过 redact_payload 脱敏。
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import settings
from app.services.redaction import redact_payload, redact_text

logger = logging.getLogger(__name__)


class LLMUnavailable(RuntimeError):
    pass


def _truncate(text: str, max_len: int = 400) -> str:
    text = (text or "").replace("\n", " ").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _parse_json_content(content: str) -> dict[str, Any]:
    """从 LLM 回复中解析 JSON（兼容 ```json ... ``` 包裹）。"""
    text = (content or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)


def llm_enabled() -> bool:
    return bool(settings.LLM_API_KEY) and settings.ALLOW_EXTERNAL_LLM


def chat_json(
    system: str,
    user: str | dict[str, Any],
    *,
    temperature: float = 0.2,
    redact: bool = True,
    caller: str = "unknown",
) -> dict[str, Any] | None:
    """发起一次 chat 调用并要求返回 JSON。失败/未配置时返回 None。"""
    if not llm_enabled():
        logger.info(
            "[LLM] skip caller=%s reason=disabled (api_key=%s allow_external=%s)",
            caller,
            bool(settings.LLM_API_KEY),
            settings.ALLOW_EXTERNAL_LLM,
        )
        return None

    if isinstance(user, dict):
        user_payload: Any = redact_payload(user) if redact else user
        user_text = json.dumps(user_payload, ensure_ascii=False)
    else:
        user_text = redact_text(user) if redact else user

    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text},
        ],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": settings.LLM_USER_AGENT,
    }
    url = settings.LLM_BASE_URL.rstrip("/") + "/chat/completions"

    logger.info(
        "[LLM] request caller=%s model=%s url=%s temperature=%s system_len=%d user_len=%d user_preview=%r",
        caller,
        settings.LLM_MODEL,
        url,
        temperature,
        len(system),
        len(user_text),
        _truncate(user_text),
    )

    started = time.perf_counter()
    try:
        with httpx.Client(timeout=settings.LLM_TIMEOUT) as client:
            resp = client.post(url, json=payload, headers=headers)
            elapsed_ms = (time.perf_counter() - started) * 1000
            if resp.status_code >= 400:
                logger.error(
                    "[LLM] http_error caller=%s status=%d elapsed_ms=%.0f body=%r",
                    caller,
                    resp.status_code,
                    elapsed_ms,
                    _truncate(resp.text, 800),
                )
                resp.raise_for_status()
            data = resp.json()
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage") or {}
        parsed = _parse_json_content(content)
        logger.info(
            "[LLM] success caller=%s elapsed_ms=%.0f prompt_tokens=%s completion_tokens=%s "
            "response_keys=%s content_preview=%r",
            caller,
            elapsed_ms,
            usage.get("prompt_tokens"),
            usage.get("completion_tokens"),
            list(parsed.keys()) if isinstance(parsed, dict) else type(parsed).__name__,
            _truncate(content),
        )
        return parsed
    except json.JSONDecodeError as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.error(
            "[LLM] json_parse_error caller=%s elapsed_ms=%.0f error=%s content_preview=%r",
            caller,
            elapsed_ms,
            exc,
            _truncate(locals().get("content", "")),
        )
        return None
    except httpx.HTTPStatusError as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.error(
            "[LLM] http_status_error caller=%s elapsed_ms=%.0f status=%s body=%r",
            caller,
            elapsed_ms,
            exc.response.status_code,
            _truncate(exc.response.text, 800),
        )
        return None
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.exception(
            "[LLM] error caller=%s elapsed_ms=%.0f error_type=%s",
            caller,
            elapsed_ms,
            type(exc).__name__,
        )
        return None
