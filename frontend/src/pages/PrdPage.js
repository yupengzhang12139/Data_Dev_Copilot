import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
export function PrdPage() {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [prd, setPrd] = useState(null);
    const [edits, setEdits] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!rid)
            return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.prd(rid);
                setPrd(res.prd);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    if (loading || !prd)
        return _jsx(Layout, { current: "prd", children: _jsx(Loading, { text: "AI \u6B63\u5728\u751F\u6210 PRD..." }) });
    const confirm = async () => {
        if (!rid)
            return;
        setSubmitting(true);
        try {
            await api.confirmPrd(rid, edits);
            navigate(`/r/${rid}/history`);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(Layout, { current: "prd", children: [_jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "3. PRD \u9884\u89C8" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "\u786E\u8BA4\u5B57\u6BB5\u503C\uFF0C\u5F85\u786E\u8BA4\u9879\u53EF\u76F4\u63A5\u8865\u9F50\uFF1B\u70B9\u51FB\"\u786E\u8BA4 PRD\"\u8FDB\u5165\u5386\u53F2\u8D44\u4EA7\u63A8\u8350\u3002" }), _jsx("div", { className: "mt-5 grid grid-cols-1 md:grid-cols-2 gap-4", children: prd.sections.map((s) => (_jsxs("div", { className: `rounded-md border p-4 ${s.status === "confirmed"
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50"}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: s.label }), _jsx("span", { className: `tag ring-1 ${s.status === "confirmed"
                                                ? "bg-white text-emerald-700 ring-emerald-300"
                                                : "bg-white text-amber-700 ring-amber-300"}`, children: s.status === "confirmed" ? "已确认" : "待确认" })] }), s.status === "confirmed" ? (_jsx("div", { className: "mt-2 text-sm text-slate-800", children: s.value })) : (_jsx("input", { className: "mt-2 w-full rounded-md border border-slate-300 p-2 text-sm", placeholder: s.hint || "请补充", value: edits[s.key] ?? "", onChange: (e) => setEdits({ ...edits, [s.key]: e.target.value }) }))] }, s.key))) }), _jsx("div", { className: "mt-6 flex items-center gap-3", children: _jsx("button", { className: "btn-primary", disabled: submitting, onClick: confirm, children: "\u786E\u8BA4 PRD\uFF0C\u8FDB\u5165\u5386\u53F2\u8D44\u4EA7\u63A8\u8350" }) })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "PRD Markdown" }), _jsx("pre", { className: "text-xs bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto whitespace-pre-wrap", children: prd.markdown })] })] }));
}
