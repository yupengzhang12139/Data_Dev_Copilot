import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
import { getRole } from "../session";

const STATUS_LABELS: Record<string, string> = {
  published: "待开发",
  in_development: "开发中",
  validate: "验证中",
  release: "已生成上线建议",
};

export function BoardPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = getRole();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.requirementBoard();
        setItems(res.requirements);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Layout current="board"><Loading text="正在加载公共需求看板..." /></Layout>;

  return (
    <Layout current="board">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">公共需求看板</h2>
            <p className="mt-1 text-sm text-slate-500">
              分析师发布后的需求会进入这里，数仓开发工程师可选择需求进入开发工作流。
            </p>
          </div>
          {role === "analyst" ? (
            <button className="btn-secondary" onClick={() => navigate("/analyst")}>继续提需求</button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-md bg-slate-50 p-5 text-sm text-slate-500 ring-1 ring-slate-200">
            还没有已发布需求。分析师发布需求后，会自动出现在这里。
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => {
              const title = item.confirmed?.metric_name || item.confirmed?.business_goal || item.raw_text;
              const status = STATUS_LABELS[item.status] || STATUS_LABELS[item.stage] || item.status;
              return (
                <article key={item.requirement_id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        需求 ID：<code>{item.requirement_id}</code>
                        {item.published_at ? <> · 发布时间：{new Date(item.published_at).toLocaleString()}</> : null}
                      </div>
                    </div>
                    <span className="tag bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{status}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 line-clamp-2">{item.raw_text}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(item.confirmed || {}).slice(0, 5).map(([key, value]) => (
                      <span key={key} className="tag bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button className="btn-primary" onClick={() => navigate(`/r/${item.requirement_id}/build`)}>
                      选择并进入开发
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}
