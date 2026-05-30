import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
export function HistoryPage() {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!rid)
            return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.history(rid);
                setData(res.result);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    if (loading || !data)
        return _jsx(Layout, { current: "history", children: _jsx(Loading, { text: "\u6B63\u5728\u626B\u63CF dbt \u4ED3\u5E93..." }) });
    return (_jsx(Layout, { current: "history", children: _jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "4. \u5386\u53F2\u6307\u6807\u5173\u8054" }), _jsxs("p", { className: "mt-1 text-sm text-slate-500", children: ["\u5DF2\u626B\u63CF dbt \u4ED3\u5E93\uFF1A", data.scanned.model_count, " models \u00B7 ", data.scanned.metric_count, " metrics \u00B7", " ", data.scanned.exposure_count, " exposures"] }), data.candidates.length === 0 ? (_jsx("div", { className: "mt-5 rounded-md bg-amber-50 p-4 text-sm text-amber-800", children: "\u672A\u627E\u5230\u76F8\u4F3C\u5386\u53F2\u8D44\u4EA7\uFF0C\u5C06\u8D70\"\u65B0\u5EFA\u6A21\u578B\"\u65B9\u6848\u3002" })) : (_jsx("ul", { className: "mt-5 space-y-4", children: data.candidates.map((c) => (_jsxs("li", { className: "rounded-md border border-slate-200 p-4", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium text-slate-900", children: [c.name, " ", _jsxs("span", { className: "text-xs text-slate-500", children: ["(", c.resource_type, " \u00B7 ", c.layer, ")"] })] }), _jsx("div", { className: "mt-1 text-xs text-slate-500", children: c.file_path }), _jsx("div", { className: "mt-2 text-sm text-slate-700", children: c.description || "—" })] }), _jsxs("span", { className: "tag bg-brand-50 text-brand-700 ring-1 ring-brand-100", children: ["\u76F8\u4F3C\u5EA6 ", (c.score * 100).toFixed(0), "%"] })] }), _jsxs("div", { className: "mt-3 text-xs text-slate-600", children: ["\u63A8\u8350\u7406\u7531\uFF1A", c.reason] }), c.matched_tokens?.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: c.matched_tokens.map((t) => (_jsx("span", { className: "tag bg-slate-100 text-slate-600", children: t }, t))) })), Object.keys(c.diff || {}).length > 0 && (_jsx("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs", children: Object.entries(c.diff).map(([k, v]) => (_jsxs("div", { className: "rounded-md bg-slate-50 p-2 ring-1 ring-slate-200", children: [_jsx("div", { className: "font-medium text-slate-700", children: k }), _jsxs("div", { className: "text-slate-500", children: ["PRD\uFF1A", v.prd || "—"] }), _jsxs("div", { className: "text-slate-500", children: ["\u8D44\u4EA7\uFF1A", v.asset || "—"] })] }, k))) })), c.risks?.length > 0 && (_jsx("ul", { className: "mt-3 list-disc pl-5 text-xs text-amber-800", children: c.risks.map((r, i) => _jsx("li", { children: r }, i)) }))] }, c.unique_id))) })), _jsxs("div", { className: "mt-6 flex gap-3", children: [_jsx("button", { className: "btn-primary", onClick: () => navigate(`/r/${rid}/lineage`), children: "\u67E5\u770B\u8840\u7F18 / \u6570\u636E\u5730\u56FE" }), _jsx("button", { className: "btn-secondary", onClick: () => navigate(`/r/${rid}/conflict`), children: "\u76F4\u63A5\u8FDB\u5165\u53E3\u5F84\u786E\u8BA4" })] })] }) }));
}
