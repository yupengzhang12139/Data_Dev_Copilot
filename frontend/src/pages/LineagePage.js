import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
const LAYERS = ["source", "staging", "intermediate", "marts", "metrics", "exposures", "model"];
const LAYER_COLORS = {
    source: "bg-slate-100 text-slate-700 ring-slate-300",
    staging: "bg-sky-50 text-sky-700 ring-sky-200",
    intermediate: "bg-violet-50 text-violet-700 ring-violet-200",
    marts: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    metrics: "bg-amber-50 text-amber-700 ring-amber-200",
    exposures: "bg-pink-50 text-pink-700 ring-pink-200",
    model: "bg-slate-100 text-slate-700 ring-slate-300",
};
export function LineagePage() {
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
                const res = await api.lineage(rid);
                setData(res.result);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    if (loading || !data)
        return _jsx(Layout, { current: "lineage", children: _jsx(Loading, { text: "\u6B63\u5728\u751F\u6210 dbt DAG \u8840\u7F18..." }) });
    const grouped = {};
    for (const n of data.graph.nodes) {
        grouped[n.layer] = grouped[n.layer] || [];
        grouped[n.layer].push(n);
    }
    return (_jsx(Layout, { current: "lineage", children: _jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "5. \u6570\u636E\u5730\u56FE" }), _jsxs("p", { className: "mt-1 text-sm text-slate-500", children: ["\u57FA\u4E8E dbt DAG \u751F\u6210\u4E0A\u4E0B\u6E38\u8840\u7F18\uFF0C\u8986\u76D6 source / staging / intermediate / marts / metrics / exposures\u3002", data.focus ? _jsxs(_Fragment, { children: [" \u7126\u70B9\uFF1A", _jsx("code", { children: data.focus }), "\uFF0C\u4E0A\u6E38 ", data.upstream_count, " \u00B7 \u4E0B\u6E38 ", data.downstream_count, "\u3002"] }) : null] }), _jsx("div", { className: "mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: LAYERS.filter((l) => grouped[l]?.length).map((layer) => (_jsxs("div", { className: "rounded-md border border-slate-200 p-3", children: [_jsx("div", { className: `tag ring-1 ${LAYER_COLORS[layer]}`, children: layer }), _jsx("ul", { className: "mt-2 text-sm space-y-1", children: grouped[layer].map((n) => (_jsxs("li", { className: "rounded-sm hover:bg-slate-50 px-2 py-1 cursor-default", children: [_jsx("div", { className: "font-mono text-xs text-slate-500", children: n.id }), _jsx("div", { className: "font-medium", children: n.name }), _jsxs("div", { className: "text-xs text-slate-500", children: [n.resource_type, " ", n.materialized ? `· ${n.materialized}` : ""] })] }, n.id))) })] }, layer))) }), _jsxs("div", { className: "mt-5 card p-4 bg-slate-50", children: [_jsxs("div", { className: "text-sm font-medium mb-2", children: ["\u4F9D\u8D56\u8FB9\uFF08", data.graph.edges.length, "\uFF09"] }), _jsx("div", { className: "text-xs space-y-1 max-h-64 overflow-auto", children: data.graph.edges.map((e, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-slate-500 truncate max-w-[40%]", children: e.source }), _jsx("span", { className: "text-slate-400", children: "\u2192" }), _jsx("span", { className: "font-mono text-slate-700 truncate max-w-[55%]", children: e.target })] }, i))) })] }), _jsx("div", { className: "mt-6", children: _jsx("button", { className: "btn-primary", onClick: () => navigate(`/r/${rid}/conflict`), children: "\u8FDB\u5165\u53E3\u5F84\u786E\u8BA4" }) })] }) }));
}
