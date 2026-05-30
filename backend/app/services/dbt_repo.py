"""dbt 仓库解析器（PRD 3.1.3）。

从 manifest.json / catalog.json / SQL / yml 抽取：
- model / source / staging / mart
- columns（含 schema tests）
- exposures / metrics
- 上下游 DAG（depends_on）
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import settings


@dataclass
class DbtNode:
    unique_id: str
    name: str
    resource_type: str
    schema: str = ""
    materialized: str = ""
    description: str = ""
    layer: str = ""
    tags: list[str] = field(default_factory=list)
    columns: dict[str, dict[str, Any]] = field(default_factory=dict)
    depends_on: list[str] = field(default_factory=list)
    raw_sql: str = ""
    file_path: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "unique_id": self.unique_id,
            "name": self.name,
            "resource_type": self.resource_type,
            "schema": self.schema,
            "materialized": self.materialized,
            "description": self.description,
            "layer": self.layer,
            "tags": self.tags,
            "columns": self.columns,
            "depends_on": self.depends_on,
            "raw_sql": self.raw_sql,
            "file_path": self.file_path,
        }


@dataclass
class DbtRepoSnapshot:
    project_dir: Path
    manifest_present: bool
    catalog_present: bool
    models: dict[str, DbtNode] = field(default_factory=dict)
    sources: dict[str, DbtNode] = field(default_factory=dict)
    metrics: dict[str, DbtNode] = field(default_factory=dict)
    exposures: dict[str, DbtNode] = field(default_factory=dict)
    tests: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def all_assets(self) -> list[DbtNode]:
        return list(self.models.values()) + list(self.metrics.values()) + list(self.exposures.values())

    def to_summary(self) -> dict[str, Any]:
        return {
            "project_dir": str(self.project_dir),
            "manifest_present": self.manifest_present,
            "catalog_present": self.catalog_present,
            "model_count": len(self.models),
            "source_count": len(self.sources),
            "metric_count": len(self.metrics),
            "exposure_count": len(self.exposures),
            "test_count": len(self.tests),
            "warnings": self.warnings,
        }


def _layer_of(unique_id: str, fqn: list[str] | None) -> str:
    p = "/".join(fqn or [])
    for k in ("staging", "intermediate", "marts", "metrics", "exposures"):
        if k in p:
            return k
    if unique_id.startswith("source."):
        return "source"
    return "model"


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def parse_dbt_repo(project_dir: Path | None = None) -> DbtRepoSnapshot:
    project_dir = project_dir or settings.dbt_project_path
    target_dir = project_dir / "target"
    manifest = _read_json(target_dir / "manifest.json")
    catalog = _read_json(target_dir / "catalog.json")

    snap = DbtRepoSnapshot(
        project_dir=project_dir,
        manifest_present=manifest is not None,
        catalog_present=catalog is not None,
    )
    if manifest is None:
        snap.warnings.append(
            f"未找到 manifest.json，请在 {target_dir} 下生成（dbt parse / dbt compile）。"
        )
        return snap

    nodes: dict[str, Any] = manifest.get("nodes", {})
    sources: dict[str, Any] = manifest.get("sources", {})
    metrics: dict[str, Any] = manifest.get("metrics", {})
    exposures: dict[str, Any] = manifest.get("exposures", {})

    cat_nodes = (catalog or {}).get("nodes", {})

    for uid, n in nodes.items():
        rtype = n.get("resource_type")
        if rtype == "model":
            cols = n.get("columns") or {}
            cat_cols = (cat_nodes.get(uid, {}) or {}).get("columns", {}) or {}
            merged_cols: dict[str, dict[str, Any]] = {}
            for cname, c in cols.items():
                merged_cols[cname] = {
                    "type": (cat_cols.get(cname) or {}).get("type", c.get("data_type", "")),
                    "description": c.get("description", ""),
                    "tests": [
                        t["test_metadata"]["name"] if isinstance(t, dict) else t
                        for t in c.get("tests", []) or []
                    ],
                }
            for cname, c in cat_cols.items():
                merged_cols.setdefault(
                    cname,
                    {"type": c.get("type", ""), "description": "", "tests": []},
                )
            node = DbtNode(
                unique_id=uid,
                name=n.get("name", ""),
                resource_type="model",
                schema=n.get("schema", ""),
                materialized=(n.get("config") or {}).get("materialized", ""),
                description=n.get("description", ""),
                layer=_layer_of(uid, n.get("fqn")),
                tags=n.get("tags", []) or [],
                columns=merged_cols,
                depends_on=(n.get("depends_on") or {}).get("nodes", []) or [],
                raw_sql=n.get("raw_code", n.get("raw_sql", "")) or "",
                file_path=n.get("original_file_path", ""),
            )
            snap.models[uid] = node
        elif rtype == "test":
            snap.tests.append(
                {
                    "unique_id": uid,
                    "name": n.get("name"),
                    "test_metadata": n.get("test_metadata", {}),
                    "depends_on": (n.get("depends_on") or {}).get("nodes", []) or [],
                }
            )

    for uid, s in sources.items():
        snap.sources[uid] = DbtNode(
            unique_id=uid,
            name=s.get("name", ""),
            resource_type="source",
            schema=s.get("schema", ""),
            description=s.get("description", ""),
            layer="source",
            file_path=s.get("original_file_path", ""),
        )

    for uid, m in metrics.items():
        snap.metrics[uid] = DbtNode(
            unique_id=uid,
            name=m.get("name", ""),
            resource_type="metric",
            description=m.get("description", ""),
            depends_on=(m.get("depends_on") or {}).get("nodes", []) or [],
            file_path=m.get("original_file_path", ""),
            tags=m.get("tags", []) or [],
            columns={"definition": {"expression": m.get("expression", ""), "type": m.get("type", "")}},
        )

    for uid, e in exposures.items():
        snap.exposures[uid] = DbtNode(
            unique_id=uid,
            name=e.get("name", ""),
            resource_type="exposure",
            description=e.get("description", ""),
            depends_on=(e.get("depends_on") or {}).get("nodes", []) or [],
            file_path=e.get("original_file_path", ""),
        )

    return snap


@lru_cache(maxsize=1)
def get_repo_snapshot() -> DbtRepoSnapshot:
    return parse_dbt_repo()


def reload_repo_snapshot() -> DbtRepoSnapshot:
    get_repo_snapshot.cache_clear()
    return get_repo_snapshot()


def build_lineage(snap: DbtRepoSnapshot, focus: str | None = None) -> dict[str, Any]:
    """返回上下游血缘。focus 为模型 unique_id，None 时返回全图。"""
    nodes_map: dict[str, DbtNode] = {**snap.sources, **snap.models, **snap.metrics, **snap.exposures}
    edges: list[tuple[str, str]] = []
    for uid, n in nodes_map.items():
        for dep in n.depends_on:
            if dep in nodes_map:
                edges.append((dep, uid))

    if focus:
        upstream: set[str] = set()
        downstream: set[str] = set()

        def walk_up(uid: str) -> None:
            for src, dst in edges:
                if dst == uid and src not in upstream:
                    upstream.add(src)
                    walk_up(src)

        def walk_down(uid: str) -> None:
            for src, dst in edges:
                if src == uid and dst not in downstream:
                    downstream.add(dst)
                    walk_down(dst)

        walk_up(focus)
        walk_down(focus)
        keep = upstream | downstream | {focus}
        nodes_map = {k: v for k, v in nodes_map.items() if k in keep}
        edges = [(a, b) for a, b in edges if a in keep and b in keep]

    return {
        "nodes": [
            {
                "id": uid,
                "name": n.name,
                "layer": n.layer,
                "resource_type": n.resource_type,
                "schema": n.schema,
                "materialized": n.materialized,
            }
            for uid, n in nodes_map.items()
        ],
        "edges": [{"source": a, "target": b} for a, b in edges],
    }
