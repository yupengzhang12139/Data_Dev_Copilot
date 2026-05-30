import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";

const SAMPLES = [
  "我想新增一个用户 7 日留存指标，用于增长日报，希望按渠道、版本、注册日期分析，排除测试账号和内部员工。",
  "请帮我统计每周新增订单的支付成功率，按渠道与城市维度，时间窗口为最近 8 周。",
  "需要一个会话级活跃指标，用于运营周报，按 app 版本和地域分析。",
];

export function InputPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "error" }));
  }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.createRequirement(text.trim());
      navigate(`/r/${res.requirement_id}/clarify`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout current="input">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">1. 自然语言需求输入</h2>
        <p className="mt-1 text-sm text-slate-500">
          直接描述业务背景、目标和指标需求，AI 最多追问 3 轮帮你补齐口径。
        </p>
        <textarea
          className="mt-4 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          rows={6}
          placeholder="例：我想新增一个用户 7 日留存指标..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setText(s)}
              className="text-xs rounded-full bg-slate-100 px-3 py-1 text-slate-600 hover:bg-slate-200"
            >
              示例 {i + 1}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary" onClick={submit} disabled={submitting || !text.trim()}>
            {submitting ? "提交中..." : "开始澄清需求"}
          </button>
          <span className="text-xs text-slate-400">
            提交后将进入需求澄清 Agent，最多追问 3 轮。
          </span>
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">系统状态</h3>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Stat label="健康检查" value={health.status} ok={health.status === "ok"} />
            <Stat
              label="LLM 是否启用"
              value={health.llm_enabled ? "已启用" : "未配置 / 降级模式"}
              ok={health.llm_enabled}
              hint={!health.llm_enabled ? "未配置 LLM_API_KEY，启发式 + 模板降级" : undefined}
            />
            <Stat
              label="dbt manifest"
              value={health.dbt_repo?.manifest_present ? "已加载" : "缺失"}
              ok={health.dbt_repo?.manifest_present}
            />
            <Stat label="model 数量" value={health.dbt_repo?.model_count ?? 0} ok />
            <Stat label="metric 数量" value={health.dbt_repo?.metric_count ?? 0} ok />
            <Stat label="exposure 数量" value={health.dbt_repo?.exposure_count ?? 0} ok />
          </div>
        ) : (
          <div className="text-sm text-slate-400">检查后端中...</div>
        )}
      </section>
    </Layout>
  );
}

function Stat({ label, value, ok, hint }: { label: string; value: any; ok?: boolean; hint?: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-medium ${ok ? "text-emerald-700" : "text-amber-700"}`}>
        {String(value)}
      </div>
      {hint ? <div className="text-xs text-slate-400 mt-1">{hint}</div> : null}
    </div>
  );
}
