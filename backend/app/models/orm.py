"""ORM 模型：会话/产物/埋点事件。

PRD 5.1 要求会话状态可恢复（阶段、已确认字段、待确认项），
6.1 要求 15 个核心埋点事件落库。
"""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class Requirement(Base):
    """一次端到端的开发会话。"""

    __tablename__ = "requirements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), default="analyst")
    project_id: Mapped[str] = mapped_column(String(64), default="default")
    raw_text: Mapped[str] = mapped_column(Text, default="")
    stage: Mapped[str] = mapped_column(String(32), default="input")
    state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=lambda: dt.datetime.utcnow()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime,
        default=lambda: dt.datetime.utcnow(),
        onupdate=lambda: dt.datetime.utcnow(),
    )


class Artifact(Base):
    """阶段产物（PRD / dbt 代码 / tests / 验数 SQL / 上线建议 ...）。"""

    __tablename__ = "artifacts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    requirement_id: Mapped[str] = mapped_column(String(64), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=lambda: dt.datetime.utcnow()
    )


class TelemetryEvent(Base):
    """PRD 6.1 业务埋点事件。"""

    __tablename__ = "telemetry_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    requirement_id: Mapped[str | None] = mapped_column(String(64), index=True)
    event: Mapped[str] = mapped_column(String(64), index=True)
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=lambda: dt.datetime.utcnow()
    )
