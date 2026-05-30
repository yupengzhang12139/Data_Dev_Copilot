"""埋点事件落库（PRD 6.1）。"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.orm import TelemetryEvent

VALID_EVENTS = {
    "data_dev_requirement_submitted",
    "data_dev_clarification_started",
    "data_dev_clarification_answered",
    "data_dev_prd_generated",
    "data_dev_history_assets_scanned",
    "data_dev_asset_recommended",
    "data_dev_lineage_generated",
    "data_dev_conflict_detected",
    "data_dev_dbt_code_generated",
    "data_dev_join_key_recommended",
    "data_dev_dbt_validation_finished",
    "data_dev_sql_diff_finished",
    "data_dev_root_cause_generated",
    "data_dev_release_advice_generated",
    "data_dev_artifact_exported",
}


def emit(db: Session, event: str, *, requirement_id: str | None = None, properties: dict | None = None) -> None:
    if event not in VALID_EVENTS:
        return
    db.add(
        TelemetryEvent(
            event=event,
            requirement_id=requirement_id,
            properties=properties or {},
        )
    )
    db.commit()
