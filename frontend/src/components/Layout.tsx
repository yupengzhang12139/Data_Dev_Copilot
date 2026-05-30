import { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROLE_META, UserRole, clearRole, getRole } from "../session";

const STAGES = [
  { key: "input", label: "1. 提需求", path: "/analyst", role: "analyst" },
  { key: "clarify", label: "2. 给口径", path: "/clarify", role: "analyst" },
  { key: "prd", label: "3. 看 PRD", path: "/prd", role: "analyst" },
  { key: "history", label: "4. 相似口径", path: "/history", role: "analyst" },
  { key: "lineage", label: "5. 看数仓血缘", path: "/lineage", role: "analyst" },
  { key: "conflict", label: "6. 口径确认", path: "/conflict", role: "analyst" },
  { key: "publish", label: "7. 发布需求", path: "/conflict", role: "analyst" },
  { key: "board", label: "1. 需求看板", path: "/board", role: "developer" },
  { key: "build", label: "2. dbt 开发", path: "/build", role: "developer" },
  { key: "validate", label: "3. 验证数据", path: "/validate", role: "developer" },
  { key: "release", label: "4. 上线建议", path: "/release", role: "developer" },
];

const ROLE_GROUPS = [
  {
    key: "analyst",
    title: "分析师",
    description: "提需求、给口径、发布到看板",
  },
  {
    key: "developer",
    title: "数仓开发工程师",
    description: "从看板接需求、开发验证、生成上线建议",
  },
];

interface Props {
  current: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

export function Layout({ current, children, rightSlot }: Props) {
  const navigate = useNavigate();
  const { rid } = useParams();
  const sessionRole = getRole();
  const currentStage = STAGES.find((s) => s.key === current);
  const activeRole = (sessionRole || currentStage?.role || "analyst") as UserRole;
  const visibleStages = STAGES.filter((s) => s.role === activeRole);
  const idx = visibleStages.findIndex((s) => s.key === current);

  const restart = () => {
    if (!rid) {
      navigate(activeRole === "developer" ? "/board" : "/analyst");
      return;
    }
    const ok = window.confirm("确定要重新开始一个新需求吗？当前需求记录仍会保留。");
    if (ok) navigate(activeRole === "developer" ? "/board" : "/analyst");
  };

  const switchRole = () => {
    clearRole();
    navigate("/");
  };

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
            {rid ? <span>需求 ID：<code className="text-slate-700">{rid}</code></span> : null}
            <button type="button" onClick={restart} className="btn-secondary px-3 py-1.5 text-xs">
              {activeRole === "developer" ? "回到看板" : "重新提需"}
            </button>
            <button type="button" onClick={switchRole} className="btn-secondary px-3 py-1.5 text-xs">
              切换身份
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 overflow-x-auto">
          <div className="flex items-start gap-6 min-w-max">
            {ROLE_GROUPS.filter((group) => group.key === activeRole).map((group) => {
              return (
                <section
                  key={group.key}
                  className="rounded-md px-3 py-2 ring-1 bg-brand-50 ring-brand-100"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-700">{group.title}</span>
                    <span className="text-[11px] text-slate-400">{group.description}</span>
                  </div>
                  <ol className="flex items-center gap-2">
                    {visibleStages.map((s, stageIndex) => {
                      const status = stageIndex < idx ? "done" : stageIndex === idx ? "active" : "pending";
                      const colors = {
                        done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                        active: "bg-brand-500 text-white ring-brand-700",
                        pending: "bg-white text-slate-500 ring-slate-200",
                      }[status];
                      const clickable =
                        s.key === "input" ||
                        s.key === "board" ||
                        (rid && (status === "done" || status === "active"));
                      const target =
                        s.key === "input" || s.key === "board"
                          ? s.path
                          : rid
                            ? `/r/${rid}${s.path}`
                            : s.path;
                      return (
                        <li key={s.key} className="flex items-center gap-2">
                          <button
                            disabled={!clickable}
                            onClick={() => navigate(target)}
                            className={`tag ring-1 ${colors} ${clickable ? "cursor-pointer hover:opacity-90" : ""}`}
                          >
                            {s.label}
                          </button>
                          {stageIndex < visibleStages.length - 1 ? <span className="text-slate-300">→</span> : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-9">{children}</div>
          <aside className="col-span-12 lg:col-span-3">
            {rightSlot ?? (
              <div className="space-y-4">
                <RoleCard />
                <ComplianceCard />
              </div>
            )}
          </aside>
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
        <div className="mt-1">提需求、补充口径、查看历史相似指标和数仓血缘、确认冲突。</div>
      </div>
      <div className="mt-3 rounded-md bg-emerald-50 p-3 ring-1 ring-emerald-100">
        <div className="font-medium text-emerald-700">数仓开发</div>
        <div className="mt-1">Review dbt 代码、Join Key 依据、schema tests、验证结果和上线建议。</div>
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
