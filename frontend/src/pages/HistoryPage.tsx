import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

export function HistoryPage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.history(rid);
        setData(res.result);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  if (loading || !data) return <Layout current="history"><Loading text="正在扫描 dbt 仓库..." /></Layout>;

  return (
    <Layout current="history" noSidebar>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">4. 历史指标关联</h2>
        <p className="mt-1 text-sm text-slate-500">
          已扫描 dbt 仓库：{data.scanned.model_count} models · {data.scanned.metric_count} metrics ·{" "}
          {data.scanned.exposure_count} exposures
        </p>

        {data.candidates.length === 0 ? (
          <div className="mt-5 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
            未找到相似历史资产，将走"新建模型"方案。
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {data.candidates.map((c: any) => (
              <li key={c.unique_id} className="rounded-md border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-900">
                      {c.name}{" "}
                      <span className="text-xs text-slate-500">({c.resource_type} · {c.layer})</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{c.file_path}</div>
                    <div className="mt-2 text-sm text-slate-700">{c.description || "—"}</div>
                  </div>
                  <span className="tag bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    相似度 {(c.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-600">推荐理由：{c.reason}</div>
                {c.matched_tokens?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.matched_tokens.map((t: string) => (
                      <span key={t} className="tag bg-slate-100 text-slate-600">{t}</span>
                    ))}
                  </div>
                )}
                {Object.keys(c.diff || {}).length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(c.diff).map(([k, v]: any) => (
                      <div key={k} className="rounded-md bg-slate-50 p-2 ring-1 ring-slate-200">
                        <div className="font-medium text-slate-700">{k}</div>
                        <div className="text-slate-500">PRD：{v.prd || "—"}</div>
                        <div className="text-slate-500">资产：{v.asset || "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
                {c.risks?.length > 0 && (
                  <ul className="mt-3 list-disc pl-5 text-xs text-amber-800">
                    {c.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex gap-3">
          <button className="btn-primary" onClick={() => navigate(`/r/${rid}/lineage`)}>
            查看血缘 / 数据地图
          </button>
          <button className="btn-secondary" onClick={() => navigate(`/r/${rid}/conflict`)}>
            直接进入口径确认
          </button>
        </div>
      </section>
    </Layout>
  );
}
