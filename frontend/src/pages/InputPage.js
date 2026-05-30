import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { getRole } from "../session";
const SAMPLES = [
    "我想新增一个用户 7 日留存指标，用于增长日报，希望按渠道、版本、注册日期分析，排除测试账号和内部员工。",
    "请帮我统计每周新增订单的支付成功率，按渠道与城市维度，时间窗口为最近 8 周。",
    "需要一个会话级活跃指标，用于运营周报，按 app 版本和地域分析。",
];
export function InputPage() {
    const navigate = useNavigate();
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [health, setHealth] = useState(null);
    useEffect(() => {
        api.health().then(setHealth).catch(() => setHealth({ status: "error" }));
    }, []);
    const submit = async () => {
        if (!text.trim())
            return;
        setSubmitting(true);
        try {
            const res = await api.createRequirement(text.trim(), getRole() || "analyst");
            navigate(`/r/${res.requirement_id}/clarify`);
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(Layout, { current: "input", children: [_jsxs("section", { className: "card p-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "1. \u81EA\u7136\u8BED\u8A00\u9700\u6C42\u8F93\u5165" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "\u76F4\u63A5\u63CF\u8FF0\u4E1A\u52A1\u80CC\u666F\u3001\u76EE\u6807\u548C\u6307\u6807\u9700\u6C42\uFF0CAI \u6700\u591A\u8FFD\u95EE 3 \u8F6E\u5E2E\u4F60\u8865\u9F50\u53E3\u5F84\uFF1B\u786E\u8BA4\u540E\u53EF\u53D1\u5E03\u5230\u516C\u5171\u9700\u6C42\u770B\u677F\u3002" }), _jsx("textarea", { className: "mt-4 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100", rows: 6, placeholder: "\u4F8B\uFF1A\u6211\u60F3\u65B0\u589E\u4E00\u4E2A\u7528\u6237 7 \u65E5\u7559\u5B58\u6307\u6807...", value: text, onChange: (e) => setText(e.target.value) }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: SAMPLES.map((s, i) => (_jsxs("button", { type: "button", onClick: () => setText(s), className: "text-xs rounded-full bg-slate-100 px-3 py-1 text-slate-600 hover:bg-slate-200", children: ["\u793A\u4F8B ", i + 1] }, i))) }), _jsxs("div", { className: "mt-5 flex items-center gap-3", children: [_jsx("button", { className: "btn-primary", onClick: submit, disabled: submitting || !text.trim(), children: submitting ? "提交中..." : "开始澄清需求" }), _jsx("span", { className: "text-xs text-slate-400", children: "\u63D0\u4EA4\u540E\u5C06\u8FDB\u5165\u5206\u6790\u5E08\u5DE5\u4F5C\u6D41\uFF0C\u6700\u7EC8\u4EE5\u201C\u53D1\u5E03\u9700\u6C42\u201D\u7ED3\u675F\u3002" })] })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "\u6309\u89D2\u8272\u4F7F\u7528" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { className: "rounded-md border border-brand-100 bg-brand-50 p-4", children: [_jsx("div", { className: "font-medium text-brand-700", children: "\u5206\u6790\u5E08" }), _jsx("div", { className: "mt-2 text-slate-600", children: "\u4ECE\u81EA\u7136\u8BED\u8A00\u63D0\u9700\u6C42\u5F00\u59CB\uFF0C\u8865\u5145\u6307\u6807\u53E3\u5F84\uFF0C\u67E5\u770B\u5386\u53F2\u76F8\u4F3C\u53E3\u5F84\u3001\u6570\u4ED3\u8840\u7F18\u548C\u51B2\u7A81\u8BC1\u636E\u3002" }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: ["提需求", "给口径", "看相似口径", "确认冲突"].map((item) => (_jsx("span", { className: "tag bg-white text-brand-700 ring-1 ring-brand-100", children: item }, item))) })] }), _jsxs("div", { className: "rounded-md border border-emerald-100 bg-emerald-50 p-4", children: [_jsx("div", { className: "font-medium text-emerald-700", children: "\u6570\u4ED3\u5F00\u53D1" }), _jsx("div", { className: "mt-2 text-slate-600", children: "\u63A5\u624B\u5DF2\u786E\u8BA4\u53E3\u5F84\uFF0CReview AI \u751F\u6210\u7684 dbt \u4EE3\u7801\u3001Join Key \u63A8\u8350\u3001schema tests \u548C\u9A8C\u8BC1\u7ED3\u679C\u3002" }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: ["dbt 开发", "验证数据", "SQL Diff", "上线建议"].map((item) => (_jsx("span", { className: "tag bg-white text-emerald-700 ring-1 ring-emerald-100", children: item }, item))) })] })] })] }), _jsxs("section", { className: "card p-6 mt-6", children: [_jsx("h3", { className: "font-semibold mb-3", children: "\u7CFB\u7EDF\u72B6\u6001" }), health ? (_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3 text-sm", children: [_jsx(Stat, { label: "\u5065\u5EB7\u68C0\u67E5", value: health.status, ok: health.status === "ok" }), _jsx(Stat, { label: "LLM \u662F\u5426\u542F\u7528", value: health.llm_enabled ? "已启用" : "未配置 / 降级模式", ok: health.llm_enabled, hint: !health.llm_enabled ? "未配置 LLM_API_KEY，启发式 + 模板降级" : undefined }), _jsx(Stat, { label: "dbt manifest", value: health.dbt_repo?.manifest_present ? "已加载" : "缺失", ok: health.dbt_repo?.manifest_present }), _jsx(Stat, { label: "model \u6570\u91CF", value: health.dbt_repo?.model_count ?? 0, ok: true }), _jsx(Stat, { label: "metric \u6570\u91CF", value: health.dbt_repo?.metric_count ?? 0, ok: true }), _jsx(Stat, { label: "exposure \u6570\u91CF", value: health.dbt_repo?.exposure_count ?? 0, ok: true })] })) : (_jsx("div", { className: "text-sm text-slate-400", children: "\u68C0\u67E5\u540E\u7AEF\u4E2D..." }))] })] }));
}
function Stat({ label, value, ok, hint }) {
    return (_jsxs("div", { className: "rounded-md border border-slate-200 p-3 bg-slate-50", children: [_jsx("div", { className: "text-xs text-slate-500", children: label }), _jsx("div", { className: `mt-1 text-base font-medium ${ok ? "text-emerald-700" : "text-amber-700"}`, children: String(value) }), hint ? _jsx("div", { className: "text-xs text-slate-400 mt-1", children: hint }) : null] }));
}
