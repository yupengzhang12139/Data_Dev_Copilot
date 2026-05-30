import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
const ADVICE_COLORS = {
    "建议上线": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "需人工确认": "bg-amber-50 text-amber-700 ring-amber-200",
    "不建议上线": "bg-red-50 text-red-700 ring-red-200",
};
export function ReleasePage() {
    const { rid } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [artifacts, setArtifacts] = useState([]);
    useEffect(() => {
        if (!rid)
            return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.release(rid);
                setData(res.result);
                const arts = await api.artifacts(rid);
                setArtifacts(arts.artifacts);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    if (loading || !data)
        return _jsx(Layout, { current: "release", children: _jsx(Loading, { text: "\u6B63\u5728\u6C47\u603B\u9A8C\u8BC1\u7ED3\u679C..." }) });
    return (_jsxs(Layout, { current: "release", children: [_jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "9. \u4E0A\u7EBF\u5EFA\u8BAE" }), _jsx("div", { className: "mt-4", children: _jsx("span", { className: `tag ring-1 px-4 py-2 text-base ${ADVICE_COLORS[data.advice] || ADVICE_COLORS["需人工确认"]}`, children: data.advice }) }), _jsx("ul", { className: "mt-4 list-disc pl-5 text-sm text-slate-700 space-y-1", children: data.reasons.map((r, i) => _jsx("li", { children: r }, i)) }), _jsx("p", { className: "mt-4 text-xs text-slate-400", children: data.compliance_note })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "\u6700\u7EC8\u4EA7\u7269\u5F52\u6863" }), _jsx("p", { className: "text-xs text-slate-500 mb-3", children: "\u6309 PRD 3.1.16\uFF0C\u4EA7\u7269\u5305\u542B\uFF1APRD\u3001dbt \u4EE3\u7801\u3001tests\u3001\u9A8C\u6570 SQL\u3001\u4E0A\u7EBF\u5EFA\u8BAE\u3002" }), _jsx("ul", { className: "text-sm space-y-2", children: artifacts.map((a) => (_jsxs("li", { className: "rounded-md border border-slate-200 p-3 bg-slate-50", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: a.kind }), _jsx("div", { className: "text-xs text-slate-400", children: a.created_at })] }), _jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "text-xs text-brand-600 cursor-pointer", children: "\u67E5\u770B payload" }), _jsx("pre", { className: "mt-2 text-xs bg-white p-3 rounded ring-1 ring-slate-200 max-h-64 overflow-auto whitespace-pre-wrap", children: JSON.stringify(a.payload, null, 2) })] })] }, a.id))) })] })] }));
}
