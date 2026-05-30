import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Loading({ text = "加载中..." }) {
    return (_jsxs("div", { className: "card p-8 flex flex-col items-center gap-3 text-slate-500", children: [_jsx("div", { className: "h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" }), _jsx("div", { className: "text-sm", children: text })] }));
}
