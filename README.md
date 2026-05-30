# Data Dev Copilot · MVP v0.1

端到端数据开发提效 Agent —— 基于 [Data_Dev_Copilot_PRD.md](./Data_Dev_Copilot_PRD.md) 实现的可运行 MVP。

覆盖 PRD 第 3 章 16 项交付能力：从自然语言需求 → 需求澄清 → 结构化 PRD → 历史指标关联 → 数据地图 → 口径确认 → dbt 代码生成（含 Join Key 推荐 + 基础 schema tests + SQL 优化）→ 验数 SQL Diff → dbt build/test → Root Cause → 上线建议。

## 项目结构

```
Data_Dev_Copilot/
├─ Data_Dev_Copilot_PRD.md       # 原 PRD
├─ backend/                      # FastAPI 后端
│  ├─ app/
│  │  ├─ agents/                 # 9 个 Agent 实现
│  │  ├─ services/               # dbt 解析、LLM、脱敏、Git 写入
│  │  ├─ api/                    # 路由 + 埋点
│  │  ├─ core/                   # 配置 + DB
│  │  └─ models/                 # ORM + Pydantic
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/                     # React + Vite + TS + Tailwind
│  └─ src/
│     ├─ pages/                  # 9 个阶段页面
│     ├─ components/
│     └─ api.ts
└─ sample_dbt_project/           # 内置示例 dbt 工程（带 manifest/catalog）
```

## 关键设计与 PRD 对齐

| PRD 章节 | 实现位置 |
|---|---|
| 3.1.1 自然语言需求输入 | `frontend/src/pages/InputPage.tsx` |
| 3.1.2 需求澄清 + 结构化 PRD（最多 3 轮） | `backend/app/agents/clarify.py` |
| 3.1.3 dbt 仓库检索 | `backend/app/services/dbt_repo.py` |
| 3.1.4 历史指标关联 | `backend/app/agents/history_assets.py` |
| 3.1.5 数据地图（DAG 全链路） | `backend/app/agents/lineage.py` |
| 3.1.6 自动识别数据源 | `backend/app/agents/dbt_builder.py` ·`_infer_sources` |
| 3.1.7 口径确认（仅报告冲突，不裁决） | `backend/app/agents/conflict.py` |
| 3.1.8 dbt 代码生成（model + schema.yml + tests） | `backend/app/agents/dbt_builder.py` |
| 3.1.9 Join Key 推荐（依据 + 置信度） | `backend/app/agents/dbt_builder.py` ·`_recommend_join_keys` |
| 3.1.10 SQL 优化（ref/source、增量、避免硬编码） | `backend/app/agents/dbt_builder.py` |
| 3.1.11 基础 schema tests（not_null/unique/...） | `backend/app/agents/dbt_builder.py` |
| 3.1.12 验数 SQL Diff | `backend/app/agents/sql_diff.py` |
| 3.1.13 dbt build/test 执行 | `backend/app/agents/sql_diff.py` ·`run_dbt_validation`（演示用模拟器，可替换为真实 `dbt build`） |
| 3.1.14 Root Cause | `backend/app/agents/sql_diff.py` ·`root_cause` |
| 3.1.15 上线建议 | `backend/app/agents/sql_diff.py` ·`release_advice` |
| 3.1.16 最终产物记录 | `Artifact` 表 + `/api/requirements/{rid}/artifacts` |
| 4.3 脱敏 / 不发送密钥 | `backend/app/services/redaction.py`（外发 LLM 前强制脱敏） |
| 4.3 合规声明 | 前端 `Layout` + 各阶段返回的 `compliance_note` |
| 5.1 会话状态保留与恢复 | `Requirement.state` JSON + 顶部进度条可点击回退 |
| 5.4 本地 Git 分支写入（不创建 PR） | `backend/app/services/git_writer.py` |
| 6.1 15 个核心埋点事件 | `backend/app/api/telemetry.py` |

## 快速启动

### 1. 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # 可选：填入 LLM_API_KEY 启用真实大模型
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端将在 `http://127.0.0.1:8000` 启动。访问 `http://127.0.0.1:8000/docs` 查看自动生成的 OpenAPI 文档。

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

前端启动后访问 `http://127.0.0.1:5173`。Vite 已配置 `/api` 代理到后端。

### 3. LLM 配置（可选）

未配置 `LLM_API_KEY` 时，系统使用启发式 + 模板降级实现，端到端流程仍能完整跑通；配置后会切换到真实 LLM（OpenAI 兼容协议，支持 OpenAI / DeepSeek / Qwen / 自建）。

```env
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.openai.com/v1     # 或 https://api.deepseek.com/v1 等
LLM_MODEL=gpt-4o-mini
```

外发请求前会强制经过 `redact_payload`：自动脱敏手机号、身份证、邮箱、密钥/token/host/JDBC 连接串、精确金额。

### 4. 接入你的 dbt 仓库

修改 `backend/.env`：

```env
DBT_PROJECT_DIR=/absolute/path/to/your/dbt_project
```

要求项目下 `target/manifest.json` 与 `target/catalog.json` 已生成（可在你的 dbt 仓库中执行 `dbt parse && dbt docs generate`）。

调用 `POST /api/dbt/reload` 重新加载，或重启后端。

### 5. dbt build/test

MVP 默认使用模拟执行器（输出符合 `run_results.json` 结构的结果），便于零环境演示。生产接入只需替换 `backend/app/agents/sql_diff.py` 中 `run_dbt_validation` 为真实 `subprocess.run(["dbt", "build", "--select", model])` 并解析 `target/run_results.json`。

## 演示路径

打开 `http://127.0.0.1:5173`，输入示例需求：

> 我想新增一个用户 7 日留存指标，用于增长日报，希望按渠道、版本、注册日期分析，排除测试账号和内部员工。

逐个阶段确认即可看到：

- 需求澄清最多 3 轮追问；
- PRD 字段标注"已确认 / 待确认"；
- 历史资产推荐命中 `fct_user_retention_d7` / metric `user_retention_d7` / exposure `growth_daily_report`；
- 数据地图按 source / staging / marts / metrics / exposures 分层；
- 口径确认页只报告冲突 + 证据，需人工裁决；
- dbt 代码生成包含 `model.sql` + `schema.yml` + Join Key 推荐 + 基础 tests + SQL 优化项；
- 写入本地 dbt 项目分支（不创建 PR、不 merge）；
- 验证页同时输出 dbt build/test 结果与 SQL Diff 差异等级；
- Root Cause 在失败时给出假设 + 证据 + 下一步动作；
- 上线建议稳定输出"建议上线 / 不建议上线 / 需人工确认"。

## 不在 MVP 范围（PRD 3.2）

- 不自动上线生产、不自动 merge、不自动创建 PR；
- 不接 BI / FineReport / OpenMetadata / DQC API / 埋点平台；
- 指标冲突不由 AI 自动裁决；
- 不替代分析师/数开的最终判断。

合规声明每个阶段页面均会展示。
