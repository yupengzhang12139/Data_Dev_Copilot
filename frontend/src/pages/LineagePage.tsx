import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

const LAYERS = ["source", "staging", "intermediate", "marts", "metrics", "exposures", "model"];
const LAYER_COLORS: Record<string, string> = {
  source: "bg-slate-100 text-slate-700 ring-slate-300",
  staging: "bg-sky-50 text-sky-700 ring-sky-200",
  intermediate: "bg-violet-50 text-violet-700 ring-violet-200",
  marts: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  metrics: "bg-amber-50 text-amber-700 ring-amber-200",
  exposures: "bg-pink-50 text-pink-700 ring-pink-200",
  model: "bg-slate-100 text-slate-700 ring-slate-300",
};

export function LineagePage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.lineage(rid);
        setData(res.result);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  if (loading || !data) return <Layout current="lineage"><Loading text="正在生成 dbt DAG 血缘..." /></Layout>;

  const grouped: Record<string, any[]> = {};
  for (const n of data.graph.nodes) {
    grouped[n.layer] = grouped[n.layer] || [];
    grouped[n.layer].push(n);
  }

  return (
    <Layout current="lineage" noSidebar>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">5. 数据地图</h2>
        <p className="mt-1 text-sm text-slate-500">
          基于 dbt DAG 生成上下游血缘，覆盖 source / staging / intermediate / marts / metrics / exposures。
          {data.focus ? <> 焦点：<code>{data.focus}</code>，上游 {data.upstream_count} · 下游 {data.downstream_count}。</> : null}
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LAYERS.filter((l) => grouped[l]?.length).map((layer) => (
            <div key={layer} className="rounded-md border border-slate-200 p-3">
              <div className={`tag ring-1 ${LAYER_COLORS[layer]}`}>{layer}</div>
              <ul className="mt-2 text-sm space-y-1">
                {grouped[layer].map((n) => (
                  <li key={n.id} className="rounded-sm hover:bg-slate-50 px-2 py-1 cursor-default">
                    <div className="font-mono text-xs text-slate-500">{n.id}</div>
                    <div className="font-medium">{n.name}</div>
                    <div className="text-xs text-slate-500">
                      {n.resource_type} {n.materialized ? `· ${n.materialized}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 card p-4 bg-slate-50">
          <div className="text-sm font-medium mb-2">依赖边（{data.graph.edges.length}）</div>
          <div className="text-xs space-y-1 max-h-64 overflow-auto">
            {data.graph.edges.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-mono text-slate-500 truncate max-w-[40%]">{e.source}</span>
                <span className="text-slate-400">→</span>
                <span className="font-mono text-slate-700 truncate max-w-[55%]">{e.target}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button className="btn-primary" onClick={() => navigate(`/r/${rid}/conflict`)}>
            进入口径确认
          </button>
        </div>
      </section>
    </Layout>
  );
}
