import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, useParams } from "react-router-dom";
import { ROLE_META, clearRole, getRole } from "../session";
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
export function Layout({ current, children, rightSlot }) {
    const navigate = useNavigate();
    const { rid } = useParams();
    const sessionRole = getRole();
    const currentStage = STAGES.find((s) => s.key === current);
    const activeRole = (sessionRole || currentStage?.role || "analyst");
    const visibleStages = STAGES.filter((s) => s.role === activeRole);
    const idx = visibleStages.findIndex((s) => s.key === current);
    const restart = () => {
        if (!rid) {
            navigate(activeRole === "developer" ? "/board" : "/analyst");
            return;
        }
        const ok = window.confirm("确定要重新开始一个新需求吗？当前需求记录仍会保留。");
        if (ok)
            navigate(activeRole === "developer" ? "/board" : "/analyst");
    };
    const switchRole = () => {
        clearRole();
        navigate("/");
    };
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx("header", { className: "border-b bg-white", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-brand-700", children: "Data Dev Copilot" }), _jsx("p", { className: "text-xs text-slate-500", children: "\u7AEF\u5230\u7AEF\u6570\u636E\u5F00\u53D1\u63D0\u6548 Agent \u00B7 MVP v0.1" })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-500", children: [_jsxs("span", { children: ["\u5F53\u524D\u8EAB\u4EFD\uFF1A", _jsx("strong", { className: "text-slate-700", children: ROLE_META[activeRole].label })] }), rid ? _jsxs("span", { children: ["\u9700\u6C42 ID\uFF1A", _jsx("code", { className: "text-slate-700", children: rid })] }) : null, _jsx("button", { type: "button", onClick: restart, className: "btn-secondary px-3 py-1.5 text-xs", children: activeRole === "developer" ? "回到看板" : "重新提需" }), _jsx("button", { type: "button", onClick: switchRole, className: "btn-secondary px-3 py-1.5 text-xs", children: "\u5207\u6362\u8EAB\u4EFD" })] })] }) }), _jsx("nav", { className: "bg-white border-b", children: _jsx("div", { className: "max-w-7xl mx-auto px-6 py-3 overflow-x-auto", children: _jsx("div", { className: "flex items-start gap-6 min-w-max", children: ROLE_GROUPS.filter((group) => group.key === activeRole).map((group) => {
                            return (_jsxs("section", { className: "rounded-md px-3 py-2 ring-1 bg-brand-50 ring-brand-100", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx("span", { className: "text-xs font-semibold text-brand-700", children: group.title }), _jsx("span", { className: "text-[11px] text-slate-400", children: group.description })] }), _jsx("ol", { className: "flex items-center gap-2", children: visibleStages.map((s, stageIndex) => {
                                            const status = stageIndex < idx ? "done" : stageIndex === idx ? "active" : "pending";
                                            const colors = {
                                                done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                                                active: "bg-brand-500 text-white ring-brand-700",
                                                pending: "bg-white text-slate-500 ring-slate-200",
                                            }[status];
                                            const clickable = s.key === "input" ||
                                                s.key === "board" ||
                                                (rid && (status === "done" || status === "active"));
                                            const target = s.key === "input" || s.key === "board"
                                                ? s.path
                                                : rid
                                                    ? `/r/${rid}${s.path}`
                                                    : s.path;
                                            return (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx("button", { disabled: !clickable, onClick: () => navigate(target), className: `tag ring-1 ${colors} ${clickable ? "cursor-pointer hover:opacity-90" : ""}`, children: s.label }), stageIndex < visibleStages.length - 1 ? _jsx("span", { className: "text-slate-300", children: "\u2192" }) : null] }, s.key));
                                        }) })] }, group.key));
                        }) }) }) }), _jsx("main", { className: "flex-1", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6", children: [_jsx("div", { className: "col-span-12 lg:col-span-9", children: children }), _jsx("aside", { className: "col-span-12 lg:col-span-3", children: rightSlot ?? (_jsxs("div", { className: "space-y-4", children: [_jsx(RoleCard, {}), _jsx(ComplianceCard, {})] })) })] }) }), _jsx("footer", { className: "border-t bg-white py-3", children: _jsx("div", { className: "max-w-7xl mx-auto px-6 text-xs text-slate-400", children: "AI \u4E0D\u4F1A\u81EA\u52A8\u4E0A\u7EBF\u751F\u4EA7\u3001\u81EA\u52A8 merge \u6216\u81EA\u52A8\u88C1\u51B3\u6307\u6807\u53E3\u5F84\u3002" }) })] }));
}
export function RoleCard() {
    return (_jsxs("div", { className: "card p-4 text-xs text-slate-600 leading-6", children: [_jsx("div", { className: "font-medium text-slate-800 mb-2", children: "\u89D2\u8272\u5206\u5DE5" }), _jsxs("div", { className: "rounded-md bg-brand-50 p-3 ring-1 ring-brand-100", children: [_jsx("div", { className: "font-medium text-brand-700", children: "\u5206\u6790\u5E08" }), _jsx("div", { className: "mt-1", children: "\u63D0\u9700\u6C42\u3001\u8865\u5145\u53E3\u5F84\u3001\u67E5\u770B\u5386\u53F2\u76F8\u4F3C\u6307\u6807\u548C\u6570\u4ED3\u8840\u7F18\u3001\u786E\u8BA4\u51B2\u7A81\u3002" })] }), _jsxs("div", { className: "mt-3 rounded-md bg-emerald-50 p-3 ring-1 ring-emerald-100", children: [_jsx("div", { className: "font-medium text-emerald-700", children: "\u6570\u4ED3\u5F00\u53D1" }), _jsx("div", { className: "mt-1", children: "Review dbt \u4EE3\u7801\u3001Join Key \u4F9D\u636E\u3001schema tests\u3001\u9A8C\u8BC1\u7ED3\u679C\u548C\u4E0A\u7EBF\u5EFA\u8BAE\u3002" })] })] }));
}
export function ComplianceCard() {
    return (_jsxs("div", { className: "card p-4 text-xs text-slate-600 leading-6", children: [_jsx("div", { className: "font-medium text-slate-800 mb-2", children: "\u5408\u89C4\u58F0\u660E" }), "AI \u751F\u6210\u5185\u5BB9\u4EC5\u7528\u4E8E\u8F85\u52A9\u5206\u6790\u548C\u5F00\u53D1\uFF0C\u9700\u7531\u6570\u636E\u5206\u6790\u5E08\u6216\u6570\u636E\u5F00\u53D1\u5DE5\u7A0B\u5E08\u786E\u8BA4\u540E\u4F7F\u7528\u3002 \u7CFB\u7EDF\u4E0D\u4F1A\u81EA\u52A8\u4E0A\u7EBF\u751F\u4EA7\u3001\u81EA\u52A8 merge \u6216\u81EA\u52A8\u88C1\u51B3\u6307\u6807\u53E3\u5F84\u3002"] }));
}
