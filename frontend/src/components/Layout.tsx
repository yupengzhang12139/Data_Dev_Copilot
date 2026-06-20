import { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROLE_META, UserRole, clearRole, getRole } from "../session";

/** 分析师简化版流程（仅 3 步） */
const ANALYST_STAGES_SIMPLE = [
  { key: "input", label: "1. 提需求",      path: "/analyst" },
  { key: "history", label: "2. 看相似口径", path: "/history" },
  { key: "conflict", label: "3. 发布需求",  path: "/conflict" },
];

/** 保留详细阶段用于详情页/跳转兼容 */
const ANALYST_STAGES_FULL = [
  { key: "input", label: "提需求",     path: "/analyst" },
  { key: "clarify", label: "澄清",     path: "/clarify" },
  { key: "prd", label: "PRD",         path: "/prd" },
  { key: "history", label: "相似口径", path: "/history" },
  { key: "lineage", label: "血缘",     path: "/lineage" },
  { key: "conflict", label: "确认",    path: "/conflict" },
];

const DEVELOPER_STAGES = [
  { key: "board", label: "1. 需求看板",   path: "/board" },
  { key: "build", label: "2. dbt 开发",   path: "/build" },
  { key: "validate", label: "3. 验证数据", path: "/validate" },
  { key: "release", label: "4. 上线建议",  path: "/release" },
];

const STAGE_ORDER_SIMPLE = ["input", "history", "conflict"];
const STAGE_ORDER_FULL = ["input", "clarify", "prd", "history", "lineage", "conflict"];

interface Props {
  current: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  noSidebar?: boolean;
}

export function Layout({ current, children, rightSlot, noSidebar }: Props) {
  const navigate = useNavigate();
  const { rid } = useParams();
  const sessionRole = getRole();

  const activeRole = (sessionRole || "analyst") as UserRole;
  const isAnalyst = activeRole === "analyst";
  const isDev = activeRole === "developer";

  const restart = () => {
    if (!rid) {
      navigate(isDev ? "/board" : "/analyst");
      return;
    }
    const ok = window.confirm("确定要重新开始一个新需求吗？当前需求记录仍会保留。");
    if (ok) navigate(isDev ? "/board" : "/analyst");
  };

  const switchRole = () => {
    clearRole();
    navigate("/");
  };

  /* 分析师在 hub 页面走简化导航，在子详情页走完整路线 */
  const useSimpleFlow = isAnalyst && current === "input";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">Data Dev Copilot</h1>
            <p className="text-xs text-slate-500">端到端数据开发提效 Agent · MVP v0.1</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>当前身份：<strong className="text-slate-700">{ROLE_META[activeRole].label}</strong></span>
            {rid ? <span>需求 ID：<code className="text-slate-700">{rid.slice(0, 8)}</code></span> : null}
            <button type="button" onClick={restart} className="btn-secondary px-3 py-1.5 text-xs">
              {isDev ? "回到看板" : "重新提需"}
            </button>
            <button type="button" onClick={switchRole} className="btn-secondary px-3 py-1.5 text-xs">
              切换身份
            </button>
          </div>
        </div>
      </header>

      {/* 导航栏 — 分析师 Hub 简化版 */}
      {useSimpleFlow && (
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-brand-50 ring-1 ring-brand-100">
              <span className="text-xs font-semibold text-brand-700 mr-2">分析师工作流</span>
              {ANALYST_STAGES_SIMPLE.map((s, i) => (
                <span key={s.key} className="flex items-center gap-2">
                  <span className="tag bg-brand-500 text-white ring-brand-700 cursor-default">
                    {s.label}
                  </span>
                  {i < ANALYST_STAGES_SIMPLE.length - 1 && (
                    <span className="text-slate-300 text-xs">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* 导航栏 — 子页面详细路线 */}
      {!useSimpleFlow && (
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-3 overflow-x-auto">
            <div className="flex items-start gap-6 min-w-max">
              {/* 分析师完整流程 */}
              {isAnalyst && (
                <section className="rounded-md px-3 py-2 ring-1 bg-brand-50 ring-brand-100">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-700">分析师</span>
                    <span className="text-[11px] text-slate-400">提需求 → 看相似口径 → 发布需求</span>
                  </div>
                  <ol className="flex items-center gap-2">
                    {ANALYST_STAGES_FULL.map((s, stageIndex) => {
                      const stageIdx = STAGE_ORDER_FULL.indexOf(current);
                      const idx = STAGE_ORDER_FULL.indexOf(s.key);
                      const status = idx < stageIdx ? "done" : idx === stageIdx ? "active" : "pending";
                      const colors = {
                        done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                        active: "bg-brand-500 text-white ring-brand-700",
                        pending: "bg-white text-slate-500 ring-slate-200",
                      }[status];
                      const clickable = s.key === "input" || (rid && (status === "done" || status === "active"));
                      const target = rid ? `/r/${rid}${s.path}` : s.path;
                      return (
                        <li key={s.key} className="flex items-center gap-2">
                          <button
                            disabled={!clickable}
                            onClick={() => navigate(target)}
                            className={`tag ring-1 ${colors} ${clickable ? "cursor-pointer hover:opacity-90" : ""}`}
                          >
                            {s.label}
                          </button>
                          {idx < ANALYST_STAGES_FULL.length - 1 ? <span className="text-slate-300">→</span> : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}
              {/* 数仓开发流程 */}
              {isDev && (
                <section className="rounded-md px-3 py-2 ring-1 bg-emerald-50 ring-emerald-100">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700">数仓开发工程师</span>
                    <span className="text-[11px] text-slate-400">从看板接需求 → 开发 → 验证 → 上线建议</span>
                  </div>
                  <ol className="flex items-center gap-2">
                    {DEVELOPER_STAGES.map((s, stageIndex) => {
                      const devOrder = ["board", "build", "validate", "release"];
                      const stageIdx = devOrder.indexOf(current);
                      const idx = devOrder.indexOf(s.key);
                      const status = idx < stageIdx ? "done" : idx === stageIdx ? "active" : "pending";
                      const colors = {
                        done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                        active: "bg-emerald-500 text-white ring-emerald-700",
                        pending: "bg-white text-slate-500 ring-slate-200",
                      }[status];
                      const clickable = s.key === "board" || (rid && (status === "done" || status === "active"));
                      const target = rid ? `/r/${rid}${s.path}` : s.path;
                      return (
                        <li key={s.key} className="flex items-center gap-2">
                          <button
                            disabled={!clickable}
                            onClick={() => navigate(target)}
                            className={`tag ring-1 ${colors} ${clickable ? "cursor-pointer hover:opacity-90" : ""}`}
                          >
                            {s.label}
                          </button>
                          {idx < DEVELOPER_STAGES.length - 1 ? <span className="text-slate-300">→</span> : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
          <div className={noSidebar ? "col-span-12" : "col-span-12 lg:col-span-9"}>{children}</div>
          {!noSidebar && (
            <aside className="col-span-12 lg:col-span-3">
              {rightSlot ?? (
                <div className="space-y-4">
                  <RoleCard />
                  <ComplianceCard />
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      <footer className="border-t bg-white py-3">
        <div className="max-w-7xl mx-auto px-6 text-xs text-slate-400">
          AI 不会自动上线生产、自动 merge 或自动裁决指标口径。
        </div>
      </footer>
    </div>
  );
}

export function RoleCard() {
  return (
    <div className="card p-4 text-xs text-slate-600 leading-6">
      <div className="font-medium text-slate-800 mb-2">角色分工</div>
      <div className="rounded-md bg-brand-50 p-3 ring-1 ring-brand-100">
        <div className="font-medium text-brand-700">分析师</div>
        <div className="mt-1">提需求、看相似口径、发布需求。所有分析结果一键展示。</div>
      </div>
      <div className="mt-3 rounded-md bg-emerald-50 p-3 ring-1 ring-emerald-100">
        <div className="font-medium text-emerald-700">数仓开发</div>
        <div className="mt-1">从看板接需求，Review dbt 代码、验证结果和上线建议。</div>
      </div>
    </div>
  );
}

export function ComplianceCard() {
  return (
    <div className="card p-4 text-xs text-slate-600 leading-6">
      <div className="font-medium text-slate-800 mb-2">合规声明</div>
      AI 生成内容仅用于辅助分析和开发，需由数据分析师或数据开发工程师确认后使用。
      系统不会自动上线生产、自动 merge 或自动裁决指标口径。
    </div>
  );
}
