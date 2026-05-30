import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";

export function ValidatePage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [warehouseAvailable, setWarehouseAvailable] = useState(true);

  const run = async () => {
    if (!rid) return;
    setLoading(true);
    try {
      const res = await api.validate(rid, warehouseAvailable);
      setData(res.result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
  }, [rid]);

  if (loading || !data) return <Layout current="validate"><Loading text="正在执行 dbt build/test 与 SQL Diff..." /></Layout>;

  const v = data.validation;
  const d = data.diff_run;
  const rc = data.root_cause;

  const statusColor: Record<string, string> = {
    pass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    fail: "bg-red-50 text-red-700 ring-red-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    skip: "bg-slate-50 text-slate-700 ring-slate-200",
  };

  return (
    <Layout current="validate">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">8. 开发/测试环境验证</h2>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={warehouseAvailable}
              onChange={(e) => setWarehouseAvailable(e.target.checked)}
            />
            数仓可用
          </label>
          <button className="btn-secondary text-xs" onClick={run}>重新执行</button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">dbt build / test</div>
              <span className={`tag ring-1 ${statusColor[v.status]}`}>{v.status.toUpperCase()}</span>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              models: {v.summary.model_runs} · tests: {v.summary.test_runs} · failed: {v.summary.failed_node_count}
            </div>
            <ul className="mt-3 text-xs space-y-1">
              {v.details.map((det: any, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      det.status === "success" ? "bg-emerald-500" : det.status === "fail" ? "bg-red-500" : "bg-slate-400"
                    }`}
                  />
                  <span className="font-mono">{det.node}</span>
                  <span className="text-slate-400">({det.type})</span>
                  {det.message ? <span className="text-amber-700">- {det.message}</span> : null}
                </li>
              ))}
            </ul>
            {v.warnings?.length ? (
              <div className="mt-3 text-xs text-amber-700">
                {v.warnings.map((w: string, i: number) => <div key={i}>• {w}</div>)}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">SQL Diff</div>
              <span className={`tag ring-1 ${statusColor[d.status] || statusColor.skip}`}>
                {d.status.toUpperCase()} · diff_level={d.diff_level}
              </span>
            </div>
            {data.baseline_asset ? (
              <div className="mt-2 text-xs text-slate-500">对照基准：<code>{data.baseline_asset}</code></div>
            ) : (
              <div className="mt-2 text-xs text-amber-600">未匹配到对照基准，需人工指定。</div>
            )}
            <pre className="mt-3 text-xs bg-slate-900 text-slate-100 rounded-md p-3 max-h-64 overflow-auto whitespace-pre">
{data.diff_sql}
            </pre>
            {d.metrics && Object.keys(d.metrics).length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(d.metrics).map(([k, v]) => (
                  <div key={k} className="rounded bg-slate-50 p-2 ring-1 ring-slate-200">
                    <div className="text-slate-500">{k}</div>
                    <div className="font-medium">{String(v)}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {rc.cause_count > 0 && (
          <div className="mt-6 card p-4 ring-1 ring-amber-200 bg-amber-50">
            <div className="font-semibold text-amber-800 mb-2">Root Cause 初步分析</div>
            <ul className="space-y-2 text-sm">
              {rc.causes.map((c: any, i: number) => (
                <li key={i} className="rounded bg-white p-3 ring-1 ring-amber-200">
                  <div className="text-xs text-slate-500 font-mono">{c.node} ({c.type})</div>
                  <div className="font-medium">{c.hypothesis}</div>
                  <div className="text-xs text-slate-500 mt-1">证据：{(c.evidence || []).join("；")}</div>
                  <div className="text-xs text-emerald-700 mt-1">下一步：{c.next_step}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <button className="btn-primary" onClick={() => navigate(`/r/${rid}/release`)}>
            生成上线建议
          </button>
        </div>
      </section>
    </Layout>
  );
}
