import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
import { getRole } from "../session";
const STATUS_LABELS = {
    published: "待开发",
    in_development: "开发中",
    validate: "验证中",
    release: "已生成上线建议",
};
export function BoardPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const role = getRole();
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await api.requirementBoard();
                setItems(res.requirements);
            }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    if (loading)
        return _jsx(Layout, { current: "board", children: _jsx(Loading, { text: "\u6B63\u5728\u52A0\u8F7D\u516C\u5171\u9700\u6C42\u770B\u677F..." }) });
    return (_jsx(Layout, { current: "board", children: _jsxs("section", { className: "card p-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "\u516C\u5171\u9700\u6C42\u770B\u677F" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "\u5206\u6790\u5E08\u53D1\u5E03\u540E\u7684\u9700\u6C42\u4F1A\u8FDB\u5165\u8FD9\u91CC\uFF0C\u6570\u4ED3\u5F00\u53D1\u5DE5\u7A0B\u5E08\u53EF\u9009\u62E9\u9700\u6C42\u8FDB\u5165\u5F00\u53D1\u5DE5\u4F5C\u6D41\u3002" })] }), role === "analyst" ? (_jsx("button", { className: "btn-secondary", onClick: () => navigate("/analyst"), children: "\u7EE7\u7EED\u63D0\u9700\u6C42" })) : null] }), items.length === 0 ? (_jsx("div", { className: "mt-6 rounded-md bg-slate-50 p-5 text-sm text-slate-500 ring-1 ring-slate-200", children: "\u8FD8\u6CA1\u6709\u5DF2\u53D1\u5E03\u9700\u6C42\u3002\u5206\u6790\u5E08\u53D1\u5E03\u9700\u6C42\u540E\uFF0C\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" })) : (_jsx("div", { className: "mt-6 space-y-3", children: items.map((item) => {
                        const title = item.confirmed?.metric_name || item.confirmed?.business_goal || item.raw_text;
                        const status = STATUS_LABELS[item.status] || STATUS_LABELS[item.stage] || item.status;
                        return (_jsxs("article", { className: "rounded-md border border-slate-200 bg-white p-4", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900", children: title }), _jsxs("div", { className: "mt-1 text-xs text-slate-500", children: ["\u9700\u6C42 ID\uFF1A", _jsx("code", { children: item.requirement_id }), item.published_at ? _jsxs(_Fragment, { children: [" \u00B7 \u53D1\u5E03\u65F6\u95F4\uFF1A", new Date(item.published_at).toLocaleString()] }) : null] })] }), _jsx("span", { className: "tag bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", children: status })] }), _jsx("p", { className: "mt-3 text-sm text-slate-600 line-clamp-2", children: item.raw_text }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: Object.entries(item.confirmed || {}).slice(0, 5).map(([key, value]) => (_jsxs("span", { className: "tag bg-slate-50 text-slate-600 ring-1 ring-slate-200", children: [key, ": ", String(value)] }, key))) }), _jsx("div", { className: "mt-4 flex gap-3", children: _jsx("button", { className: "btn-primary", onClick: () => navigate(`/r/${item.requirement_id}/build`), children: "\u9009\u62E9\u5E76\u8FDB\u5165\u5F00\u53D1" }) })] }, item.requirement_id));
                    }) }))] }) }));
}
