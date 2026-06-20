import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
import { getRole } from "../session";

const LEVEL_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-700 ring-red-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-50 text-slate-700 ring-slate-200",
};

export function ConflictPage() {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const role = getRole();

  useEffect(() => {
    if (!rid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.conflict(rid);
        setData(res.result);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  if (loading || !data) return <Layout current="conflict"><Loading text="AI 正在比对历史口径..." /></Layout>;

  const proceed = async () => {
    if (!rid) return;
    setSubmitting(true);
    try {
      if (role === "developer") {
        await api.resolveConflict(rid, decisions);
        navigate(`/r/${rid}/build`);
      } else {
        if (Object.keys(decisions).length > 0) {
          await api.resolveConflict(rid, decisions);
        }
        await api.publishRequirement(rid);
        navigate("/board");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const blocked = data.blocked && data.conflicts.some((c: any) => c.level === "high" && !decisions[c.asset]);
  const actionLabel = role === "developer" ? "继续 dbt 代码生成" : "发布需求";

  return (
    <Layout current="conflict" noSidebar>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">6. 口径确认</h2>
        <p className="mt-1 text-sm text-slate-500">
          AI 仅报告冲突 + 证据，不自动裁决；分析师确认后发布到公共需求看板，数仓开发再接入开发。
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="冲突总数" value={data.conflict_count} />
          <Stat label="高风险" value={data.high_count} accent={data.high_count > 0 ? "red" : "slate"} />
          <Stat label="中风险" value={data.medium_count} accent={data.medium_count > 0 ? "amber" : "slate"} />
        </div>

        {data.conflicts.length === 0 ? (
          <div className="mt-5 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">
            未发现冲突，可继续 dbt 代码生成。
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {data.conflicts.map((c: any, i: number) => (
              <li key={i} className="rounded-md border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`tag ring-1 ${LEVEL_COLORS[c.level]}`}>{c.level.toUpperCase()}</span>
                      <span className="text-sm font-medium">{c.type}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{c.message}</div>
                    <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto">
{JSON.stringify(c.evidence, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-slate-500">人工裁决：</span>
                  {["accept", "reject", "ignore"].map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name={`d-${i}`}
                        checked={decisions[c.asset] === opt}
                        onChange={() => setDecisions({ ...decisions, [c.asset]: opt })}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button className="btn-primary" disabled={submitting || blocked} onClick={proceed}>
            {blocked ? "存在高风险冲突，请先逐项裁决" : actionLabel}
          </button>
          {role !== "developer" ? (
            <span className="text-xs text-slate-400">发布后，需求会出现在公共需求看板。</span>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-400">{data.compliance_note}</p>
      </section>
    </Layout>
  );
}

function Stat({ label, value, accent = "slate" }: { label: string; value: any; accent?: string }) {
  const map: Record<string, string> = {
    slate: "text-slate-700",
    red: "text-red-700",
    amber: "text-amber-700",
  };
  return (
    <div className="rounded-md border border-slate-200 p-3 bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${map[accent]}`}>{value}</div>
    </div>
  );
}
