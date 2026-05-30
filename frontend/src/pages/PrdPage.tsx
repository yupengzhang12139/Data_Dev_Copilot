import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

export function PrdPage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [prd, setPrd] = useState<any>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.prd(rid);
        setPrd(res.prd);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  if (loading || !prd) return <Layout current="prd"><Loading text="AI 正在生成 PRD..." /></Layout>;

  const confirm = async () => {
    if (!rid) return;
    setSubmitting(true);
    try {
      await api.confirmPrd(rid, edits);
      navigate(`/r/${rid}/history`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout current="prd">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">3. PRD 预览</h2>
        <p className="mt-1 text-sm text-slate-500">
          确认字段值，待确认项可直接补齐；点击"确认 PRD"进入历史资产推荐。
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {prd.sections.map((s: any) => (
            <div
              key={s.key}
              className={`rounded-md border p-4 ${
                s.status === "confirmed"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{s.label}</div>
                <span
                  className={`tag ring-1 ${
                    s.status === "confirmed"
                      ? "bg-white text-emerald-700 ring-emerald-300"
                      : "bg-white text-amber-700 ring-amber-300"
                  }`}
                >
                  {s.status === "confirmed" ? "已确认" : "待确认"}
                </span>
              </div>
              {s.status === "confirmed" ? (
                <div className="mt-2 text-sm text-slate-800">{s.value}</div>
              ) : (
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
                  placeholder={s.hint || "请补充"}
                  value={edits[s.key] ?? ""}
                  onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button className="btn-primary" disabled={submitting} onClick={confirm}>
            确认 PRD，进入历史资产推荐
          </button>
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">PRD Markdown</h3>
        <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto whitespace-pre-wrap">
{prd.markdown}
        </pre>
      </section>
    </Layout>
  );
}
