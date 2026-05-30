"""所有 HTTP 路由：覆盖 9 个 Agent 阶段 + 会话状态 + 埋点 + 元数据。"""
from __future__ import annotations

import datetime as dt
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents import clarify, conflict, dbt_builder, history_assets, lineage, sql_diff
from app.api import telemetry
from app.core.db import get_db
from app.models.orm import Artifact, Requirement
from app.models.schemas import (
    ClarificationAnswer,
    ConflictDecision,
    GenericIdPayload,
    PRDConfirm,
    RequirementCreate,
    TelemetryIn,
)
from app.services.dbt_repo import get_repo_snapshot, reload_repo_snapshot
from app.services.git_writer import write_files
from app.services.llm import llm_enabled

router = APIRouter(prefix="/api")

COMPLIANCE_NOTE = (
    "AI 生成内容仅用于辅助分析和开发，需由数据分析师或数据开发工程师确认后使用。"
    "系统不会自动上线生产、自动 merge 或自动裁决指标口径。"
)


def _save_artifact(db: Session, requirement_id: str, kind: str, payload: dict[str, Any]) -> None:
    db.add(Artifact(requirement_id=requirement_id, kind=kind, payload=payload))


def _get_requirement(db: Session, rid: str) -> Requirement:
    obj = db.get(Requirement, rid)
    if obj is None:
        raise HTTPException(404, "requirement not found")
    return obj


def _update_state(req: Requirement, **kwargs) -> None:
    state = dict(req.state or {})
    state.update(kwargs)
    req.state = state


@router.get("/health")
def health() -> dict[str, Any]:
    snap = get_repo_snapshot()
    return {
        "status": "ok",
        "llm_enabled": llm_enabled(),
        "dbt_repo": snap.to_summary(),
        "compliance_note": COMPLIANCE_NOTE,
    }


@router.post("/dbt/reload")
def reload_dbt() -> dict[str, Any]:
    snap = reload_repo_snapshot()
    return snap.to_summary()


@router.post("/requirements")
def create_requirement(payload: RequirementCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = Requirement(
        raw_text=payload.raw_text,
        user_id=payload.user_id,
        project_id=payload.project_id,
        stage="clarify",
        state={
            "raw_text": payload.raw_text,
            "round": 0,
            "confirmed": {},
            "pending": [],
            "risks": [],
            "owner_role": payload.role,
        },
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    telemetry.emit(
        db,
        "data_dev_requirement_submitted",
        requirement_id=req.id,
        properties={
            "user_id": payload.user_id,
            "role": payload.role,
            "requirement_length": len(payload.raw_text),
            "project_id": payload.project_id,
        },
    )
    return {"requirement_id": req.id, "stage": req.stage, "state": req.state}


@router.get("/requirements")
def list_requirements(status: str | None = None, db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(Requirement).order_by(Requirement.updated_at.desc()).all()
    items: list[dict[str, Any]] = []
    for req in rows:
        state = dict(req.state or {})
        published = bool(state.get("published_at"))
        if status == "published" and not published:
            continue
        items.append(
            {
                "requirement_id": req.id,
                "stage": req.stage,
                "status": state.get("board_status") or ("published" if published else req.stage),
                "raw_text": req.raw_text,
                "project_id": req.project_id,
                "user_id": req.user_id,
                "confirmed": state.get("confirmed", {}),
                "published_at": state.get("published_at"),
                "claimed_by": state.get("claimed_by"),
                "created_at": req.created_at.isoformat(),
                "updated_at": req.updated_at.isoformat(),
            }
        )
    return {"requirements": items}


@router.get("/requirements/{rid}")
def get_requirement(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    arts = db.query(Artifact).filter(Artifact.requirement_id == rid).all()
    return {
        "requirement_id": req.id,
        "stage": req.stage,
        "state": req.state,
        "raw_text": req.raw_text,
        "artifacts": [
            {"id": a.id, "kind": a.kind, "payload": a.payload, "created_at": a.created_at.isoformat()}
            for a in arts
        ],
    }


@router.post("/requirements/{rid}/publish")
def publish_requirement(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    now = dt.datetime.utcnow().isoformat()
    state["published_at"] = state.get("published_at") or now
    state["board_status"] = "published"
    req.state = state
    req.stage = "published"
    db.commit()
    telemetry.emit(
        db,
        "data_dev_requirement_published",
        requirement_id=rid,
        properties={"project_id": req.project_id, "confirmed_field_count": len(state.get("confirmed", {}))},
    )
    return {"requirement_id": rid, "stage": req.stage, "state": state}


@router.post("/requirements/{rid}/clarify")
def run_clarify(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    prior = state.get("confirmed", {})
    result = clarify.analyze(req.raw_text, prior)

    state["confirmed"] = {**prior, **(result.get("confirmed") or {})}
    state["pending"] = result.get("pending", [])
    state["questions"] = result.get("questions", [])
    state["risks"] = result.get("risks", [])
    state["round"] = state.get("round", 0)
    req.state = state
    req.stage = "clarify"
    db.commit()

    telemetry.emit(
        db,
        "data_dev_clarification_started",
        requirement_id=rid,
        properties={
            "missing_field_count": len(state["pending"]),
            "risk_count": len(state["risks"]),
        },
    )
    return {"requirement_id": rid, "stage": req.stage, "result": result, "state": state}


@router.post("/requirements/clarify/answer")
def answer_clarify(payload: ClarificationAnswer, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, payload.requirement_id)
    state = dict(req.state or {})
    confirmed = {**state.get("confirmed", {}), **{k: v for k, v in payload.answers.items() if v}}
    state["confirmed"] = confirmed
    state["round"] = state.get("round", 0) + 1

    if state["round"] >= 3:
        result = clarify.analyze(req.raw_text, confirmed)
        state["pending"] = result["pending"]
        state["questions"] = []
        state["risks"] = result.get("risks", [])
        state["confirmed"] = {**state["confirmed"], **(result.get("confirmed") or {})}
        req.stage = "prd"
    else:
        result = clarify.analyze(req.raw_text, confirmed)
        state["pending"] = result["pending"]
        state["questions"] = result["questions"]
        state["risks"] = result.get("risks", [])
        if not state["pending"]:
            req.stage = "prd"
    req.state = state
    db.commit()

    telemetry.emit(
        db,
        "data_dev_clarification_answered",
        requirement_id=payload.requirement_id,
        properties={"round_index": state["round"], "question_count": len(state.get("questions", []))},
    )
    return {"requirement_id": payload.requirement_id, "stage": req.stage, "state": state}


@router.post("/requirements/{rid}/prd")
def generate_prd(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    confirmed = state.get("confirmed", {})
    pending = state.get("pending", [])
    risks = state.get("risks", [])
    prd = clarify.render_prd(rid, req.raw_text, confirmed, pending, risks)
    _save_artifact(db, rid, "prd", prd)
    state["prd"] = prd
    req.state = state
    req.stage = "prd"
    db.commit()
    telemetry.emit(
        db,
        "data_dev_prd_generated",
        requirement_id=rid,
        properties={
            "confirmed_field_count": prd["confirmed_count"],
            "pending_field_count": prd["pending_count"],
        },
    )
    return {"requirement_id": rid, "stage": req.stage, "prd": prd}


@router.post("/requirements/prd/confirm")
def confirm_prd(payload: PRDConfirm, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, payload.requirement_id)
    state = dict(req.state or {})
    if payload.edits:
        confirmed = state.get("confirmed", {})
        confirmed.update({k: v for k, v in (payload.edits or {}).items() if v})
        state["confirmed"] = confirmed
    req.state = state
    req.stage = "history"
    db.commit()
    return {"requirement_id": req.id, "stage": req.stage, "state": state}


@router.post("/requirements/{rid}/history")
def run_history(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    res = history_assets.recommend(state.get("confirmed", {}))
    _save_artifact(db, rid, "history_assets", res)
    state["history"] = res
    req.state = state
    req.stage = "history"
    db.commit()

    snap = get_repo_snapshot().to_summary()
    telemetry.emit(
        db,
        "data_dev_history_assets_scanned",
        requirement_id=rid,
        properties={
            "model_count": snap["model_count"],
            "metric_count": snap["metric_count"],
            "exposure_count": snap["exposure_count"],
        },
    )
    if res["candidates"]:
        top = res["candidates"][0]
        telemetry.emit(
            db,
            "data_dev_asset_recommended",
            requirement_id=rid,
            properties={
                "candidate_count": res["candidate_count"],
                "top_asset_type": top["resource_type"],
                "confidence": top["score"],
            },
        )
    return {"requirement_id": rid, "stage": req.stage, "result": res}


@router.post("/requirements/{rid}/lineage")
def run_lineage(rid: str, focus: str | None = None, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    chosen_focus = focus
    if not chosen_focus:
        cands = (state.get("history") or {}).get("candidates") or []
        if cands:
            chosen_focus = cands[0]["unique_id"]
    res = lineage.generate(chosen_focus)
    _save_artifact(db, rid, "lineage", res)
    state["lineage"] = res
    req.state = state
    req.stage = "lineage"
    db.commit()
    telemetry.emit(
        db,
        "data_dev_lineage_generated",
        requirement_id=rid,
        properties={
            "upstream_count": res["upstream_count"],
            "downstream_count": res["downstream_count"],
        },
    )
    return {"requirement_id": rid, "stage": req.stage, "result": res}


@router.post("/requirements/{rid}/conflict")
def run_conflict(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    cands = (state.get("history") or {}).get("candidates") or []
    picked = cands[0]["unique_id"] if cands else None
    res = conflict.detect(state.get("confirmed", {}), picked)
    _save_artifact(db, rid, "conflict", res)
    state["conflict"] = res
    req.state = state
    req.stage = "conflict"
    db.commit()

    by_type: dict[str, int] = {}
    for c in res["conflicts"]:
        by_type[c["type"]] = by_type.get(c["type"], 0) + 1
    for t, n in by_type.items():
        telemetry.emit(
            db,
            "data_dev_conflict_detected",
            requirement_id=rid,
            properties={"conflict_type": t, "conflict_count": n, "risk_level": "high" if res["high_count"] > 0 else "medium"},
        )
    return {"requirement_id": rid, "stage": req.stage, "result": res}


@router.post("/requirements/conflict/resolve")
def resolve_conflict(payload: ConflictDecision, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, payload.requirement_id)
    state = dict(req.state or {})
    state["conflict_decisions"] = payload.decisions
    if state.get("conflict") and not payload.decisions:
        if state["conflict"]["blocked"]:
            raise HTTPException(409, "存在高风险冲突，必须人工确认后才能继续。")
    req.state = state
    req.stage = "build"
    db.commit()
    return {"requirement_id": req.id, "stage": req.stage, "state": state}


@router.post("/requirements/{rid}/build")
def run_build(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    if state.get("published_at"):
        state["board_status"] = "in_development"
        state["claimed_by"] = state.get("claimed_by") or "developer"
    cands = (state.get("history") or {}).get("candidates") or []
    picked_ids = [c["unique_id"] for c in cands[:1]]
    res = dbt_builder.generate(rid, state.get("confirmed", {}), picked_ids)
    _save_artifact(db, rid, "dbt_build", res)
    state["build"] = res
    req.state = state
    req.stage = "build"
    db.commit()
    telemetry.emit(
        db,
        "data_dev_dbt_code_generated",
        requirement_id=rid,
        properties={
            "model_count": 1,
            "test_count": len(res["tests"]),
            "file_count": len(res["files"]),
        },
    )
    if res["join_keys"]:
        telemetry.emit(
            db,
            "data_dev_join_key_recommended",
            requirement_id=rid,
            properties={
                "join_key_count": len(res["join_keys"]),
                "confidence": res["join_keys"][0]["confidence"],
            },
        )
    return {"requirement_id": rid, "stage": req.stage, "result": res}


@router.post("/requirements/{rid}/build/write")
def write_build(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    build = state.get("build")
    if not build:
        raise HTTPException(400, "请先生成 dbt 代码。")
    res = write_files(build["files"])
    state["git_write"] = res
    req.state = state
    db.commit()
    return res


@router.post("/requirements/{rid}/validate")
def run_validate(rid: str, warehouse_available: bool = True, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    build = state.get("build")
    if not build:
        raise HTTPException(400, "请先生成 dbt 代码。")
    cands = (state.get("history") or {}).get("candidates") or []
    picked_ids = [c["unique_id"] for c in cands[:1]]

    diff_pkg = sql_diff.generate_diff_sql(state.get("confirmed", {}), picked_ids, build["model_name"])
    validation = sql_diff.run_dbt_validation(build["model_name"]) if warehouse_available else {
        "status": "skip",
        "summary": {"model_runs": 0, "test_runs": 0, "failed_node_count": 0},
        "details": [],
        "warnings": ["开发/测试环境数仓不可用，仅生成 SQL 未执行。"],
    }
    diff_run = sql_diff.run_diff(diff_pkg["diff_sql"]) if warehouse_available else {
        "status": "skip",
        "diff_level": "unknown",
        "metrics": {},
    }
    rc = sql_diff.root_cause(validation, diff_run)

    payload = {
        "diff_sql": diff_pkg["diff_sql"],
        "baseline_asset": diff_pkg["baseline_asset"],
        "validation": validation,
        "diff_run": diff_run,
        "root_cause": rc,
        "warehouse_available": warehouse_available,
        "compliance_note": COMPLIANCE_NOTE,
    }
    _save_artifact(db, rid, "validation", payload)
    state["validation"] = payload
    if state.get("published_at"):
        state["board_status"] = "validate"
    req.state = state
    req.stage = "validate"
    db.commit()

    telemetry.emit(
        db,
        "data_dev_dbt_validation_finished",
        requirement_id=rid,
        properties={"status": validation["status"], "failed_node_count": validation["summary"]["failed_node_count"]},
    )
    telemetry.emit(
        db,
        "data_dev_sql_diff_finished",
        requirement_id=rid,
        properties={"status": diff_run["status"], "diff_level": diff_run["diff_level"]},
    )
    if rc["cause_count"] > 0:
        telemetry.emit(
            db, "data_dev_root_cause_generated", requirement_id=rid, properties={"cause_count": rc["cause_count"]}
        )
    return {"requirement_id": rid, "stage": req.stage, "result": payload}


@router.post("/requirements/{rid}/release")
def run_release(rid: str, warehouse_available: bool = True, db: Session = Depends(get_db)) -> dict[str, Any]:
    req = _get_requirement(db, rid)
    state = dict(req.state or {})
    val = state.get("validation")
    conflict_state = state.get("conflict") or {}
    if not val:
        raise HTTPException(400, "请先完成验证。")
    advice = sql_diff.release_advice(val["validation"], val["diff_run"], conflict_state, warehouse_available)
    _save_artifact(db, rid, "release_advice", advice)
    state["release"] = advice
    if state.get("published_at"):
        state["board_status"] = "release"
    req.state = state
    req.stage = "release"
    db.commit()
    telemetry.emit(
        db,
        "data_dev_release_advice_generated",
        requirement_id=rid,
        properties={"advice_type": advice["advice"]},
    )
    return {"requirement_id": rid, "stage": req.stage, "result": advice}


@router.get("/requirements/{rid}/artifacts")
def list_artifacts(rid: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    arts = db.query(Artifact).filter(Artifact.requirement_id == rid).all()
    telemetry.emit(
        db, "data_dev_artifact_exported", requirement_id=rid, properties={"artifact_type": "all"}
    )
    return {
        "requirement_id": rid,
        "artifacts": [
            {"id": a.id, "kind": a.kind, "payload": a.payload, "created_at": a.created_at.isoformat()}
            for a in arts
        ],
    }


@router.post("/telemetry")
def emit_event(payload: TelemetryIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    telemetry.emit(db, payload.event, requirement_id=payload.requirement_id, properties=payload.properties)
    return {"ok": True}
