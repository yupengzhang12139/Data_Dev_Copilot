import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
export function BuildPage() {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeFile, setActiveFile] = useState(0);
    const [writeRes, setWriteRes] = useState(null);
    const [writing, setWriting] = useState(false);
    useEffect(() => {
        if (!rid)
            return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.build(rid);
                setData(res.result);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [rid]);
    const writeToBranch = async () => {
        if (!rid)
            return;
        setWriting(true);
        try {
            const res = await api.writeBuild(rid);
            setWriteRes(res);
        }
        finally {
            setWriting(false);
        }
    };
    if (loading || !data)
        return _jsx(Layout, { current: "build", children: _jsx(Loading, { text: "AI \u6B63\u5728\u751F\u6210 dbt model / schema.yml / tests..." }) });
    const file = data.files[activeFile];
    return (_jsxs(Layout, { current: "build", children: [_jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "7. dbt \u4EE3\u7801\u751F\u6210" }), _jsxs("p", { className: "mt-1 text-sm text-slate-500", children: ["\u76EE\u6807 model\uFF1A", _jsx("code", { children: data.model_name }), "\u3002\u5DF2\u6309\u73B0\u6709 dbt \u9879\u76EE\u6A21\u677F\u751F\u6210\uFF0C\u9700 Reviewer \u4EBA\u5DE5 Review\u3002"] }), _jsxs("div", { className: "mt-5 grid grid-cols-12 gap-4", children: [_jsxs("aside", { className: "col-span-12 md:col-span-3", children: [_jsx("div", { className: "text-xs font-medium text-slate-500 mb-2", children: "\u6587\u4EF6" }), _jsx("ul", { className: "space-y-1", children: data.files.map((f, i) => (_jsx("li", { children: _jsxs("button", { onClick: () => setActiveFile(i), className: `block w-full text-left px-3 py-2 text-sm rounded-md ${i === activeFile ? "bg-brand-500 text-white" : "hover:bg-slate-100 text-slate-700"}`, children: [_jsx("div", { className: "font-mono text-xs", children: f.path }), _jsx("div", { className: "text-[10px] opacity-70", children: f.kind })] }) }, i))) })] }), _jsx("div", { className: "col-span-12 md:col-span-9", children: _jsx("pre", { className: "text-xs bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto max-h-[480px] whitespace-pre", children: file.content }) })] })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "Join Key \u63A8\u8350" }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "text-left text-slate-500 text-xs uppercase", children: _jsxs("tr", { children: [_jsx("th", { className: "py-2", children: "\u5217\u540D" }), _jsx("th", { children: "\u7F6E\u4FE1\u5EA6" }), _jsx("th", { children: "\u6240\u5728\u8868" }), _jsx("th", { children: "\u4F9D\u636E" })] }) }), _jsx("tbody", { children: data.join_keys.map((jk) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "py-2 font-mono", children: jk.column }), _jsxs("td", { children: [(jk.confidence * 100).toFixed(0), "%"] }), _jsx("td", { className: "text-slate-500", children: jk.tables.join(", ") }), _jsx("td", { className: "text-slate-500", children: jk.evidence.join("；") })] }, jk.column))) })] })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "\u57FA\u7840 Schema Tests" }), _jsx("div", { className: "flex flex-wrap gap-2", children: data.tests.map((t, i) => (_jsxs("span", { className: "tag bg-slate-100 text-slate-700 ring-1 ring-slate-200", children: [t.type, "(", t.column, ")"] }, i))) })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "SQL \u4F18\u5316\u9879" }), _jsx("ul", { className: "list-disc pl-5 text-sm text-slate-700 space-y-1", children: data.optimizations.map((o, i) => _jsx("li", { children: o }, i)) })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "\u5199\u5165\u672C\u5730 dbt \u5206\u652F" }), _jsx("p", { className: "text-xs text-slate-500 mb-3", children: "\u4EC5\u5199\u5165\u6587\u4EF6\u5230\u672C\u5730 dbt \u9879\u76EE\u76EE\u5F55\uFF0C\u4E0D\u521B\u5EFA PR\u3001\u4E0D merge\u3001\u4E0D\u4E0A\u7EBF\u3002" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { className: "btn-primary", disabled: writing, onClick: writeToBranch, children: writing ? "写入中..." : "写入本地分支" }), _jsx("button", { className: "btn-secondary", onClick: () => navigate(`/r/${rid}/validate`), children: "\u8FDB\u5165\u9A8C\u8BC1\u9636\u6BB5" })] }), writeRes ? (_jsx("pre", { className: "mt-3 text-xs bg-slate-50 p-3 rounded ring-1 ring-slate-200 overflow-auto", children: JSON.stringify(writeRes, null, 2) })) : null] })] }));
}
