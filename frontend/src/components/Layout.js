import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function Layout({ current, children, rightSlot }) {
    const navigate = useNavigate();
    const { rid } = useParams();
    const idx = STAGES.findIndex((s) => s.key === current);
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx("header", { className: "border-b bg-white", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-brand-700", children: "Data Dev Copilot" }), _jsx("p", { className: "text-xs text-slate-500", children: "\u7AEF\u5230\u7AEF\u6570\u636E\u5F00\u53D1\u63D0\u6548 Agent \u00B7 MVP v0.1" })] }), _jsx("div", { className: "text-xs text-slate-500", children: rid ? _jsxs("span", { children: ["\u9700\u6C42 ID\uFF1A", _jsx("code", { className: "text-slate-700", children: rid })] }) : null })] }) }), _jsx("nav", { className: "bg-white border-b", children: _jsx("div", { className: "max-w-7xl mx-auto px-6 py-3 overflow-x-auto", children: _jsx("ol", { className: "flex items-center gap-2 min-w-max", children: STAGES.map((s, i) => {
                            const status = i < idx ? "done" : i === idx ? "active" : "pending";
                            const colors = {
                                done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                                active: "bg-brand-500 text-white ring-brand-700",
                                pending: "bg-slate-100 text-slate-500 ring-slate-200",
                            }[status];
                            const clickable = rid && (status === "done" || status === "active");
                            return (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx("button", { disabled: !clickable, onClick: () => rid && navigate(`/r/${rid}${s.path}`), className: `tag ring-1 ${colors} ${clickable ? "cursor-pointer hover:opacity-90" : ""}`, children: s.label }), i < STAGES.length - 1 ? _jsx("span", { className: "text-slate-300", children: "\u2192" }) : null] }, s.key));
                        }) }) }) }), _jsx("main", { className: "flex-1", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6", children: [_jsx("div", { className: "col-span-12 lg:col-span-9", children: children }), _jsx("aside", { className: "col-span-12 lg:col-span-3", children: rightSlot ?? _jsx(ComplianceCard, {}) })] }) }), _jsx("footer", { className: "border-t bg-white py-3", children: _jsx("div", { className: "max-w-7xl mx-auto px-6 text-xs text-slate-400", children: "AI \u4E0D\u4F1A\u81EA\u52A8\u4E0A\u7EBF\u751F\u4EA7\u3001\u81EA\u52A8 merge \u6216\u81EA\u52A8\u88C1\u51B3\u6307\u6807\u53E3\u5F84\u3002" }) })] }));
}
export function ComplianceCard() {
    return (_jsxs("div", { className: "card p-4 text-xs text-slate-600 leading-6", children: [_jsx("div", { className: "font-medium text-slate-800 mb-2", children: "\u5408\u89C4\u58F0\u660E" }), "AI \u751F\u6210\u5185\u5BB9\u4EC5\u7528\u4E8E\u8F85\u52A9\u5206\u6790\u548C\u5F00\u53D1\uFF0C\u9700\u7531\u6570\u636E\u5206\u6790\u5E08\u6216\u6570\u636E\u5F00\u53D1\u5DE5\u7A0B\u5E08\u786E\u8BA4\u540E\u4F7F\u7528\u3002 \u7CFB\u7EDF\u4E0D\u4F1A\u81EA\u52A8\u4E0A\u7EBF\u751F\u4EA7\u3001\u81EA\u52A8 merge \u6216\u81EA\u52A8\u88C1\u51B3\u6307\u6807\u53E3\u5F84\u3002"] }));
}
