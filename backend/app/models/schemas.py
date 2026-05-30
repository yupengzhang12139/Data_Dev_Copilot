"""Pydantic 入参/出参定义。"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RequirementCreate(BaseModel):
    raw_text: str = Field(..., description="自然语言需求")
    user_id: str = "analyst"
    project_id: str = "default"
    role: str = "analyst"


class ClarificationAnswer(BaseModel):
    requirement_id: str
    answers: dict[str, str] = Field(default_factory=dict)


class PRDConfirm(BaseModel):
    requirement_id: str
    edits: dict[str, Any] | None = None


class ConflictDecision(BaseModel):
    requirement_id: str
    decisions: dict[str, str] = Field(default_factory=dict)


class GenericIdPayload(BaseModel):
    requirement_id: str


class TelemetryIn(BaseModel):
    event: str
    requirement_id: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)
