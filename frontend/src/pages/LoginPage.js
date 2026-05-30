import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_META, getRole, setRole } from "../session";
const ROLE_OPTIONS = [
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
    const [currentRole, setCurrentRole] = useState(null);
    useEffect(() => {
        setCurrentRole(getRole());
    }, []);
    const chooseRole = (role) => {
        setRole(role);
        navigate(ROLE_META[role].homePath);
    };
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx("header", { className: "border-b bg-white", children: _jsxs("div", { className: "max-w-6xl mx-auto px-6 py-5", children: [_jsx("h1", { className: "text-xl font-bold text-brand-700", children: "Data Dev Copilot" }), _jsx("p", { className: "mt-1 text-xs text-slate-500", children: "\u8BF7\u9009\u62E9\u4F60\u7684\u8EAB\u4EFD\uFF0C\u7CFB\u7EDF\u4F1A\u6309\u89D2\u8272\u5C55\u793A\u5BF9\u5E94\u5DE5\u4F5C\u6D41\u3002" })] }) }), _jsx("main", { className: "max-w-6xl mx-auto px-6 py-10", children: _jsx("section", { className: "grid grid-cols-1 md:grid-cols-2 gap-5", children: ROLE_OPTIONS.map((option) => (_jsxs("button", { type: "button", onClick: () => chooseRole(option.role), className: `card p-6 text-left hover:ring-2 hover:ring-brand-200 transition ${currentRole === option.role ? "ring-2 ring-brand-300" : ""}`, children: [_jsx("div", { className: `inline-flex rounded-md border px-3 py-1 text-sm font-medium ${option.accent}`, children: option.title }), _jsx("p", { className: "mt-4 text-sm leading-6 text-slate-600", children: option.description }), _jsx("div", { className: "mt-5 flex flex-wrap items-center gap-2", children: option.flow.map((step, index) => (_jsxs("span", { className: "inline-flex items-center gap-2 text-xs text-slate-500", children: [_jsx("span", { className: "tag bg-white text-slate-700 ring-1 ring-slate-200", children: step }), index < option.flow.length - 1 ? _jsx("span", { className: "text-slate-300", children: "\u2192" }) : null] }, step))) })] }, option.role))) }) })] }));
}
