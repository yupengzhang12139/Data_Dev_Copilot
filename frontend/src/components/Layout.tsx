import { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STAGES = [
  { key: "input", label: "1. 需求输入", path: "" },
  { key: "clarify", label: "2. 需求澄清", path: "/clarify" },
  { key: "prd", label: "3. PRD 预览", path: "/prd" },
  { key: "history", label: "4. 历史资产", path: "/history" },
  { key: "lineage", label: "5. 数据地图", path: "/lineage" },
  { key: "conflict", label: "6. 口径确认", path: "/conflict" },
  { key: "build", label: "7. dbt 生成", path: "/build" },
  { key: "validate", label: "8. 验证", path: "/validate" },
  { key: "release", label: "9. 上线建议", path: "/release" },
];

interface Props {
  current: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

export function Layout({ current, children, rightSlot }: Props) {
  const navigate = useNavigate();
  const { rid } = useParams();
  const idx = STAGES.findIndex((s) => s.key === current);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">Data Dev Copilot</h1>
            <p className="text-xs text-slate-500">端到端数据开发提效 Agent · MVP v0.1</p>
          </div>
          <div className="text-xs text-slate-500">
            {rid ? <span>需求 ID：<code className="text-slate-700">{rid}</code></span> : null}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 overflow-x-auto">
          <ol className="flex items-center gap-2 min-w-max">
            {STAGES.map((s, i) => {
              const status = i < idx ? "done" : i === idx ? "active" : "pending";
              const colors = {
                done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                active: "bg-brand-500 text-white ring-brand-700",
                pending: "bg-slate-100 text-slate-500 ring-slate-200",
              }[status];
              const clickable = rid && (status === "done" || status === "active");
              return (
                <li key={s.key} className="flex items-center gap-2">
                  <button
                    disabled={!clickable}
                    onClick={() => rid && navigate(`/r/${rid}${s.path}`)}
                    className={`tag ring-1 ${colors} ${clickable ? "cursor-pointer hover:opacity-90" : ""}`}
                  >
                    {s.label}
                  </button>
                  {i < STAGES.length - 1 ? <span className="text-slate-300">→</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-9">{children}</div>
          <aside className="col-span-12 lg:col-span-3">
            {rightSlot ?? <ComplianceCard />}
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

export function ComplianceCard() {
  return (
    <div className="card p-4 text-xs text-slate-600 leading-6">
      <div className="font-medium text-slate-800 mb-2">合规声明</div>
      AI 生成内容仅用于辅助分析和开发，需由数据分析师或数据开发工程师确认后使用。
      系统不会自动上线生产、自动 merge 或自动裁决指标口径。
    </div>
  );
}
