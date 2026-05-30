import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_META, UserRole, getRole, setRole } from "../session";

const ROLE_OPTIONS: Array<{
  role: UserRole;
  title: string;
  description: string;
  flow: string[];
  accent: string;
}> = [
  {
    role: "analyst",
    title: "我是分析师",
    description: "从业务问题出发，补齐口径、确认冲突，并把确认后的需求发布到公共看板。",
    flow: ["提需求", "给口径", "看 PRD", "查血缘", "发布需求"],
    accent: "border-brand-200 bg-brand-50 text-brand-700",
  },
  {
    role: "developer",
    title: "我是数仓开发工程师",
    description: "从公共需求看板接需求，生成和 Review dbt 代码，完成验证与上线建议。",
    flow: ["需求看板", "dbt 开发", "验证数据", "上线建议"],
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setCurrentRole(getRole());
  }, []);

  const chooseRole = (role: UserRole) => {
    setRole(role);
    navigate(ROLE_META[role].homePath);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-xl font-bold text-brand-700">Data Dev Copilot</h1>
          <p className="mt-1 text-xs text-slate-500">请选择你的身份，系统会按角色展示对应工作流。</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.role}
              type="button"
              onClick={() => chooseRole(option.role)}
              className={`card p-6 text-left hover:ring-2 hover:ring-brand-200 transition ${
                currentRole === option.role ? "ring-2 ring-brand-300" : ""
              }`}
            >
              <div className={`inline-flex rounded-md border px-3 py-1 text-sm font-medium ${option.accent}`}>
                {option.title}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{option.description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {option.flow.map((step, index) => (
                  <span key={step} className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <span className="tag bg-white text-slate-700 ring-1 ring-slate-200">{step}</span>
                    {index < option.flow.length - 1 ? <span className="text-slate-300">→</span> : null}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
