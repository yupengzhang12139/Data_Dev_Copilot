import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

const ADVICE_COLORS: Record<string, string> = {
  "建议上线": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "需人工确认": "bg-amber-50 text-amber-700 ring-amber-200",
  "不建议上线": "bg-red-50 text-red-700 ring-red-200",
};

export function ReleasePage() {
  const { rid } = useParams<{ rid: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState<any[]>([]);

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.release(rid);
        setData(res.result);
        const arts = await api.artifacts(rid);
        setArtifacts(arts.artifacts);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  if (loading || !data) return <Layout current="release"><Loading text="正在汇总验证结果..." /></Layout>;

  return (
    <Layout current="release" noSidebar>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">9. 上线建议</h2>
        <div className="mt-4">
          <span className={`tag ring-1 px-4 py-2 text-base ${ADVICE_COLORS[data.advice] || ADVICE_COLORS["需人工确认"]}`}>
            {data.advice}
          </span>
        </div>
        <ul className="mt-4 list-disc pl-5 text-sm text-slate-700 space-y-1">
          {data.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
        </ul>
        <p className="mt-4 text-xs text-slate-400">{data.compliance_note}</p>
      </section>

      <section className="card p-6 mt-6">
        <h3 className="font-semibold mb-3">最终产物归档</h3>
        <p className="text-xs text-slate-500 mb-3">
          按 PRD 3.1.16，产物包含：PRD、dbt 代码、tests、验数 SQL、上线建议。
        </p>
        <ul className="text-sm space-y-2">
          {artifacts.map((a) => (
            <li key={a.id} className="rounded-md border border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.kind}</div>
                <div className="text-xs text-slate-400">{a.created_at}</div>
              </div>
              <details className="mt-2">
                <summary className="text-xs text-brand-600 cursor-pointer">查看 payload</summary>
                <pre className="mt-2 text-xs bg-white p-3 rounded ring-1 ring-slate-200 max-h-64 overflow-auto whitespace-pre-wrap">
{JSON.stringify(a.payload, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}
