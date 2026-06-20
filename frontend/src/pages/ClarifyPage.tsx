import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

export function ClarifyPage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.clarify(rid);
        setState(res.state);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  const submit = async () => {
    if (!rid) return;
    setSubmitting(true);
    try {
      const res = await api.answerClarify(rid, answers);
      setState(res.state);
      setAnswers({});
      if (res.stage === "prd") navigate(`/r/${rid}/prd`);
    } finally {
      setSubmitting(false);
    }
  };

  const skip = async () => {
    if (!rid) return;
    setSubmitting(true);
    try {
      const res = await api.answerClarify(rid, {});
      if (res.stage === "prd" || res.state?.round >= 3) {
        navigate(`/r/${rid}/prd`);
      } else {
        setState(res.state);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !state) return <Layout current="clarify"><Loading text="AI 正在分析需求完整性..." /></Layout>;

  const round = state.round ?? 0;
  const questions: Array<{ field: string; question: string; hint?: string }> = state.questions ?? [];
  const confirmed = state.confirmed ?? {};
  const risks: string[] = state.risks ?? [];
  const pending: string[] = state.pending ?? [];

  return (
    <Layout current="clarify" noSidebar>
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">2. 需求澄清</h2>
          <span className="tag bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            第 {round + 1} / 3 轮
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          AI 已识别字段完整性，针对缺失字段进行追问；最多 3 轮。
        </p>

        {questions.length === 0 ? (
          <div className="mt-4 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">
            字段已基本补齐，可前往 PRD 预览。
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {questions.map((q) => (
              <div key={q.field} className="rounded-md border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">{q.question}</div>
                {q.hint ? <div className="text-xs text-slate-500 mt-1">提示：{q.hint}</div> : null}
                <input
                  className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="请输入你的回答"
                  value={answers[q.field] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [q.field]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary" disabled={submitting} onClick={submit}>
            提交回答
          </button>
          <button className="btn-secondary" disabled={submitting} onClick={skip}>
            暂时跳过 / 进入 PRD
          </button>
          <span className="text-xs text-slate-400">未填写的字段会在 PRD 中标记为"待确认"。</span>
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold">已识别字段</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {Object.keys(confirmed).length === 0 ? (
            <div className="text-slate-400">暂无已确认字段</div>
          ) : (
            Object.entries(confirmed).map(([k, v]) => (
              <div key={k} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs text-emerald-700">{k}</div>
                <div className="mt-1 text-emerald-900">{String(v)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {(risks.length > 0 || pending.length > 0) && (
        <section className="card p-6 mt-6">
          <h3 className="font-semibold">风险与缺失项</h3>
          {pending.length > 0 && (
            <div className="mt-3 text-sm">
              <div className="text-slate-500 mb-1">待补充字段：</div>
              <div className="flex flex-wrap gap-2">
                {pending.map((p) => (
                  <span key={p} className="tag bg-amber-50 text-amber-700 ring-1 ring-amber-200">{p}</span>
                ))}
              </div>
            </div>
          )}
          {risks.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">
              {risks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </section>
      )}
    </Layout>
  );
}
