import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
import { getRole } from "../session";
const LEVEL_COLORS = {
    high: "bg-red-50 text-red-700 ring-red-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    low: "bg-slate-50 text-slate-700 ring-slate-200",
};
export function ConflictPage() {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [decisions, setDecisions] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const role = getRole();
    useEffect(() => {
        if (!rid)
            return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.conflict(rid);
                setData(res.result);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    if (loading || !data)
        return _jsx(Layout, { current: "conflict", children: _jsx(Loading, { text: "AI \u6B63\u5728\u6BD4\u5BF9\u5386\u53F2\u53E3\u5F84..." }) });
    const proceed = async () => {
        if (!rid)
            return;
        setSubmitting(true);
        try {
            if (role === "developer") {
                await api.resolveConflict(rid, decisions);
                navigate(`/r/${rid}/build`);
            }
            else {
                if (Object.keys(decisions).length > 0) {
                    await api.resolveConflict(rid, decisions);
                }
                await api.publishRequirement(rid);
                navigate("/board");
            }
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const blocked = data.blocked && data.conflicts.some((c) => c.level === "high" && !decisions[c.asset]);
    const actionLabel = role === "developer" ? "继续 dbt 代码生成" : "发布需求";
    return (_jsx(Layout, { current: "conflict", children: _jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "6. \u53E3\u5F84\u786E\u8BA4" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "AI \u4EC5\u62A5\u544A\u51B2\u7A81 + \u8BC1\u636E\uFF0C\u4E0D\u81EA\u52A8\u88C1\u51B3\uFF1B\u5206\u6790\u5E08\u786E\u8BA4\u540E\u53D1\u5E03\u5230\u516C\u5171\u9700\u6C42\u770B\u677F\uFF0C\u6570\u4ED3\u5F00\u53D1\u518D\u63A5\u5165\u5F00\u53D1\u3002" }), _jsxs("div", { className: "mt-4 grid grid-cols-3 gap-3 text-sm", children: [_jsx(Stat, { label: "\u51B2\u7A81\u603B\u6570", value: data.conflict_count }), _jsx(Stat, { label: "\u9AD8\u98CE\u9669", value: data.high_count, accent: data.high_count > 0 ? "red" : "slate" }), _jsx(Stat, { label: "\u4E2D\u98CE\u9669", value: data.medium_count, accent: data.medium_count > 0 ? "amber" : "slate" })] }), data.conflicts.length === 0 ? (_jsx("div", { className: "mt-5 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700", children: "\u672A\u53D1\u73B0\u51B2\u7A81\uFF0C\u53EF\u7EE7\u7EED dbt \u4EE3\u7801\u751F\u6210\u3002" })) : (_jsx("ul", { className: "mt-5 space-y-3", children: data.conflicts.map((c, i) => (_jsxs("li", { className: "rounded-md border border-slate-200 p-4", children: [_jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `tag ring-1 ${LEVEL_COLORS[c.level]}`, children: c.level.toUpperCase() }), _jsx("span", { className: "text-sm font-medium", children: c.type })] }), _jsx("div", { className: "mt-2 text-sm text-slate-700", children: c.message }), _jsx("pre", { className: "mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto", children: JSON.stringify(c.evidence, null, 2) })] }) }), _jsxs("div", { className: "mt-3 flex items-center gap-2 text-sm", children: [_jsx("span", { className: "text-slate-500", children: "\u4EBA\u5DE5\u88C1\u51B3\uFF1A" }), ["accept", "reject", "ignore"].map((opt) => (_jsxs("label", { className: "inline-flex items-center gap-1", children: [_jsx("input", { type: "radio", name: `d-${i}`, checked: decisions[c.asset] === opt, onChange: () => setDecisions({ ...decisions, [c.asset]: opt }) }), opt] }, opt)))] })] }, i))) })), _jsxs("div", { className: "mt-6 flex items-center gap-3", children: [_jsx("button", { className: "btn-primary", disabled: submitting || blocked, onClick: proceed, children: blocked ? "存在高风险冲突，请先逐项裁决" : actionLabel }), role !== "developer" ? (_jsx("span", { className: "text-xs text-slate-400", children: "\u53D1\u5E03\u540E\uFF0C\u9700\u6C42\u4F1A\u51FA\u73B0\u5728\u516C\u5171\u9700\u6C42\u770B\u677F\u3002" })) : null] }), _jsx("p", { className: "mt-4 text-xs text-slate-400", children: data.compliance_note })] }) }));
}
function Stat({ label, value, accent = "slate" }) {
    const map = {
        slate: "text-slate-700",
        red: "text-red-700",
        amber: "text-amber-700",
    };
    return (_jsxs("div", { className: "rounded-md border border-slate-200 p-3 bg-white", children: [_jsx("div", { className: "text-xs text-slate-500", children: label }), _jsx("div", { className: `mt-1 text-xl font-semibold ${map[accent]}`, children: value })] }));
}
