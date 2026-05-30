"""把 AI 生成的 dbt 文件写入本地 dbt 仓库的工作分支（PRD 5.4）。

- 不创建 PR、不 merge、不上线。
- 仅写入文件并返回写入后的相对路径。
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.config import settings


def write_files(files: list[dict[str, Any]], branch_subdir: str = "ai_generated") -> dict[str, Any]:
    project = settings.dbt_project_path
    if not project.exists():
        return {"ok": False, "written": [], "error": f"dbt 项目不存在：{project}"}

    written: list[str] = []
    for f in files:
        rel = (f.get("path") or "").lstrip("/")
        if not rel:
            continue
        target = project / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f.get("content", ""), encoding="utf-8")
        written.append(str(target.relative_to(project)))
    return {"ok": True, "written": written, "project_dir": str(project)}
