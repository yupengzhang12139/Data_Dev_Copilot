import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
export function ValidatePage() {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [warehouseAvailable, setWarehouseAvailable] = useState(true);
    const run = async () => {
        if (!rid)
            return;
        setLoading(true);
        try {
            const res = await api.validate(rid, warehouseAvailable);
            setData(res.result);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        run();
    }, [rid]);
    if (loading || !data)
        return _jsx(Layout, { current: "validate", children: _jsx(Loading, { text: "\u6B63\u5728\u6267\u884C dbt build/test \u4E0E SQL Diff..." }) });
    const v = data.validation;
    const d = data.diff_run;
    const rc = data.root_cause;
    const statusColor = {
        pass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        fail: "bg-red-50 text-red-700 ring-red-200",
        warn: "bg-amber-50 text-amber-700 ring-amber-200",
        skip: "bg-slate-50 text-slate-700 ring-slate-200",
    };
    return (_jsx(Layout, { current: "validate", children: _jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "8. \u5F00\u53D1/\u6D4B\u8BD5\u73AF\u5883\u9A8C\u8BC1" }), _jsxs("div", { className: "mt-2 flex items-center gap-3 text-sm", children: [_jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: warehouseAvailable, onChange: (e) => setWarehouseAvailable(e.target.checked) }), "\u6570\u4ED3\u53EF\u7528"] }), _jsx("button", { className: "btn-secondary text-xs", onClick: run, children: "\u91CD\u65B0\u6267\u884C" })] }), _jsxs("div", { className: "mt-5 grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "rounded-md border border-slate-200 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: "dbt build / test" }), _jsx("span", { className: `tag ring-1 ${statusColor[v.status]}`, children: v.status.toUpperCase() })] }), _jsxs("div", { className: "mt-3 text-sm text-slate-600", children: ["models: ", v.summary.model_runs, " \u00B7 tests: ", v.summary.test_runs, " \u00B7 failed: ", v.summary.failed_node_count] }), _jsx("ul", { className: "mt-3 text-xs space-y-1", children: v.details.map((det, i) => (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx("span", { className: `inline-block h-2 w-2 rounded-full ${det.status === "success" ? "bg-emerald-500" : det.status === "fail" ? "bg-red-500" : "bg-slate-400"}` }), _jsx("span", { className: "font-mono", children: det.node }), _jsxs("span", { className: "text-slate-400", children: ["(", det.type, ")"] }), det.message ? _jsxs("span", { className: "text-amber-700", children: ["- ", det.message] }) : null] }, i))) }), v.warnings?.length ? (_jsx("div", { className: "mt-3 text-xs text-amber-700", children: v.warnings.map((w, i) => _jsxs("div", { children: ["\u2022 ", w] }, i)) })) : null] }), _jsxs("div", { className: "rounded-md border border-slate-200 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: "SQL Diff" }), _jsxs("span", { className: `tag ring-1 ${statusColor[d.status] || statusColor.skip}`, children: [d.status.toUpperCase(), " \u00B7 diff_level=", d.diff_level] })] }), data.baseline_asset ? (_jsxs("div", { className: "mt-2 text-xs text-slate-500", children: ["\u5BF9\u7167\u57FA\u51C6\uFF1A", _jsx("code", { children: data.baseline_asset })] })) : (_jsx("div", { className: "mt-2 text-xs text-amber-600", children: "\u672A\u5339\u914D\u5230\u5BF9\u7167\u57FA\u51C6\uFF0C\u9700\u4EBA\u5DE5\u6307\u5B9A\u3002" })), _jsx("pre", { className: "mt-3 text-xs bg-slate-900 text-slate-100 rounded-md p-3 max-h-64 overflow-auto whitespace-pre", children: data.diff_sql }), d.metrics && Object.keys(d.metrics).length > 0 ? (_jsx("div", { className: "mt-3 grid grid-cols-2 gap-2 text-xs", children: Object.entries(d.metrics).map(([k, v]) => (_jsxs("div", { className: "rounded bg-slate-50 p-2 ring-1 ring-slate-200", children: [_jsx("div", { className: "text-slate-500", children: k }), _jsx("div", { className: "font-medium", children: String(v) })] }, k))) })) : null] })] }), rc.cause_count > 0 && (_jsxs("div", { className: "mt-6 card p-4 ring-1 ring-amber-200 bg-amber-50", children: [_jsx("div", { className: "font-semibold text-amber-800 mb-2", children: "Root Cause \u521D\u6B65\u5206\u6790" }), _jsx("ul", { className: "space-y-2 text-sm", children: rc.causes.map((c, i) => (_jsxs("li", { className: "rounded bg-white p-3 ring-1 ring-amber-200", children: [_jsxs("div", { className: "text-xs text-slate-500 font-mono", children: [c.node, " (", c.type, ")"] }), _jsx("div", { className: "font-medium", children: c.hypothesis }), _jsxs("div", { className: "text-xs text-slate-500 mt-1", children: ["\u8BC1\u636E\uFF1A", (c.evidence || []).join("；")] }), _jsxs("div", { className: "text-xs text-emerald-700 mt-1", children: ["\u4E0B\u4E00\u6B65\uFF1A", c.next_step] })] }, i))) })] })), _jsx("div", { className: "mt-6", children: _jsx("button", { className: "btn-primary", onClick: () => navigate(`/r/${rid}/release`), children: "\u751F\u6210\u4E0A\u7EBF\u5EFA\u8BAE" }) })] }) }));
}
