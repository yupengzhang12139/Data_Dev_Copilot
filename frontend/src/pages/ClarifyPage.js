import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
export function ClarifyPage() {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [state, setState] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!rid)
            return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.clarify(rid);
                setState(res.state);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    const submit = async () => {
        if (!rid)
            return;
        setSubmitting(true);
        try {
            const res = await api.answerClarify(rid, answers);
            setState(res.state);
            setAnswers({});
            if (res.stage === "prd")
                navigate(`/r/${rid}/prd`);
        }
        finally {
            setSubmitting(false);
        }
    };
    const skip = async () => {
        if (!rid)
            return;
        setSubmitting(true);
        try {
            const res = await api.answerClarify(rid, {});
            if (res.stage === "prd" || res.state?.round >= 3) {
                navigate(`/r/${rid}/prd`);
            }
            else {
                setState(res.state);
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading || !state)
        return _jsx(Layout, { current: "clarify", children: _jsx(Loading, { text: "AI \u6B63\u5728\u5206\u6790\u9700\u6C42\u5B8C\u6574\u6027..." }) });
    const round = state.round ?? 0;
    const questions = state.questions ?? [];
    const confirmed = state.confirmed ?? {};
    const risks = state.risks ?? [];
    const pending = state.pending ?? [];
    return (_jsxs(Layout, { current: "clarify", children: [_jsxs("section", { className: "card p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: "2. \u9700\u6C42\u6F84\u6E05" }), _jsxs("span", { className: "tag bg-slate-100 text-slate-600 ring-1 ring-slate-200", children: ["\u7B2C ", round + 1, " / 3 \u8F6E"] })] }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "AI \u5DF2\u8BC6\u522B\u5B57\u6BB5\u5B8C\u6574\u6027\uFF0C\u9488\u5BF9\u7F3A\u5931\u5B57\u6BB5\u8FDB\u884C\u8FFD\u95EE\uFF1B\u6700\u591A 3 \u8F6E\u3002" }), questions.length === 0 ? (_jsx("div", { className: "mt-4 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700", children: "\u5B57\u6BB5\u5DF2\u57FA\u672C\u8865\u9F50\uFF0C\u53EF\u524D\u5F80 PRD \u9884\u89C8\u3002" })) : (_jsx("div", { className: "mt-5 space-y-4", children: questions.map((q) => (_jsxs("div", { className: "rounded-md border border-slate-200 p-4", children: [_jsx("div", { className: "text-sm font-medium text-slate-800", children: q.question }), q.hint ? _jsxs("div", { className: "text-xs text-slate-500 mt-1", children: ["\u63D0\u793A\uFF1A", q.hint] }) : null, _jsx("input", { className: "mt-3 w-full rounded-md border border-slate-300 p-2 text-sm", placeholder: "\u8BF7\u8F93\u5165\u4F60\u7684\u56DE\u7B54", value: answers[q.field] ?? "", onChange: (e) => setAnswers({ ...answers, [q.field]: e.target.value }) })] }, q.field))) })), _jsxs("div", { className: "mt-5 flex items-center gap-3", children: [_jsx("button", { className: "btn-primary", disabled: submitting, onClick: submit, children: "\u63D0\u4EA4\u56DE\u7B54" }), _jsx("button", { className: "btn-secondary", disabled: submitting, onClick: skip, children: "\u6682\u65F6\u8DF3\u8FC7 / \u8FDB\u5165 PRD" }), _jsx("span", { className: "text-xs text-slate-400", children: "\u672A\u586B\u5199\u7684\u5B57\u6BB5\u4F1A\u5728 PRD \u4E2D\u6807\u8BB0\u4E3A\"\u5F85\u786E\u8BA4\"\u3002" })] })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold", children: "\u5DF2\u8BC6\u522B\u5B57\u6BB5" }), _jsx("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm", children: Object.keys(confirmed).length === 0 ? (_jsx("div", { className: "text-slate-400", children: "\u6682\u65E0\u5DF2\u786E\u8BA4\u5B57\u6BB5" })) : (Object.entries(confirmed).map(([k, v]) => (_jsxs("div", { className: "rounded-md border border-emerald-200 bg-emerald-50 p-3", children: [_jsx("div", { className: "text-xs text-emerald-700", children: k }), _jsx("div", { className: "mt-1 text-emerald-900", children: String(v) })] }, k)))) })] }), (risks.length > 0 || pending.length > 0) && (_jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold", children: "\u98CE\u9669\u4E0E\u7F3A\u5931\u9879" }), pending.length > 0 && (_jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 mb-1", children: "\u5F85\u8865\u5145\u5B57\u6BB5\uFF1A" }), _jsx("div", { className: "flex flex-wrap gap-2", children: pending.map((p) => (_jsx("span", { className: "tag bg-amber-50 text-amber-700 ring-1 ring-amber-200", children: p }, p))) })] })), risks.length > 0 && (_jsx("ul", { className: "mt-3 list-disc pl-5 text-sm text-amber-800", children: risks.map((r, i) => _jsx("li", { children: r }, i)) }))] }))] }));
}
