import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Layout, ComplianceCard } from "../components/Layout";
import { getRole } from "../session";

/* ── 示例需求 ── */
const SAMPLES = [
  "我想新增一个用户 7 日留存指标，用于增长日报，希望按渠道、版本、注册日期分析，排除测试账号和内部员工。",
  "请帮我统计每周新增订单的支付成功率，按渠道与城市维度，时间窗口为最近 8 周。",
  "需要一个会话级活跃指标，用于运营周报，按 app 版本和地域分析。",
];

type PipelineStep = "idle" | "submitting" | "clarify" | "prd" | "history" | "lineage" | "conflict" | "done";

/* ── 层级配色（Lineage 复用） ── */
const LAYER_COLORS: Record<string, string> = {
  source: "bg-slate-100 text-slate-700 ring-slate-300",
  staging: "bg-sky-50 text-sky-700 ring-sky-200",
  intermediate: "bg-violet-50 text-violet-700 ring-violet-200",
  marts: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  metrics: "bg-amber-50 text-amber-700 ring-amber-200",
  exposures: "bg-pink-50 text-pink-700 ring-pink-200",
  model: "bg-slate-100 text-slate-700 ring-slate-300",
};

/* ── 冲突等级配色 ── */
const LEVEL_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-700 ring-red-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-50 text-slate-700 ring-slate-200",
};

/* ── 管道状态指示器 ── */
function StepIndicator({ step, current, label }: { step: PipelineStep; current: PipelineStep; label: string }) {
  const status = current === step ? "running" : current === "done" ? "done" : "pending";
  const colors = {
    running: "bg-brand-500 text-white animate-pulse",
    done: "bg-emerald-100 text-emerald-700",
    pending: "bg-slate-100 text-slate-400",
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className={status === "pending" ? "text-slate-400" : "text-slate-700"}>{label}</span>
    </div>
  );
}

/* ── 可折叠面板 ── */
function CollapsibleSection({
  title, badge, defaultOpen = false, children,
}: {
  title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {badge && <span className="tag bg-brand-50 text-brand-700 ring-1 ring-brand-100">{badge}</span>}
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

/* ── 相似指标卡片 ── */
function MetricCard({ candidate }: { candidate: any }) {
  return (
    <div className="rounded-md border border-slate-200 p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">{candidate.name}</span>
            <span className="tag bg-brand-50 text-brand-700 ring-1 ring-brand-100 shrink-0">
              相似 {(candidate.score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="tag bg-slate-100 text-slate-600">{candidate.resource_type}</span>
            <span className="tag bg-slate-100 text-slate-600">{candidate.layer}</span>
          </div>
          <div className="mt-2 text-sm text-slate-600 line-clamp-2">{candidate.description || "—"}</div>
          {candidate.reason && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="font-medium">推荐理由：</span>{candidate.reason}
            </div>
          )}
        </div>
      </div>
      {candidate.matched_tokens?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {candidate.matched_tokens.map((t: string) => (
            <span key={t} className="tag bg-slate-100 text-slate-600">{t}</span>
          ))}
        </div>
      )}
      {candidate.diff && Object.keys(candidate.diff).length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(candidate.diff).map(([k, v]: any) => (
            <div key={k} className="rounded-md bg-slate-50 p-2 ring-1 ring-slate-200">
              <div className="font-medium text-slate-700 mb-1">{k}</div>
              <div className="text-slate-500">PRD：{v.prd || "—"}</div>
              <div className="text-slate-500">资产：{v.asset || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {candidate.risks?.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
          {candidate.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

export function AnalystHub() {
  const navigate = useNavigate();
  const role = getRole();

  const [text, setText] = useState("");
  const [rid, setRid] = useState<string | null>(null);
  const [step, setStep] = useState<PipelineStep>("idle");
  const [error, setError] = useState<string | null>(null);

  /* 各 Agent 结果 */
  const [requireData, setRequireData] = useState<any>(null);
  const [clarifyData, setClarifyData] = useState<any>(null);
  const [prdData, setPrdData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [lineageData, setLineageData] = useState<any>(null);
  const [conflictData, setConflictData] = useState<any>(null);

  /* 冲突裁决 */
  const [conflictDecisions, setConflictDecisions] = useState<Record<string, string>>({});
  const [prdEdits, setPrdEdits] = useState<Record<string, string>>({});
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  /* ── 管道后续步骤（澄清之后） ── */
  const continuePipeline = async (id: string) => {
    try {
      setStep("prd");
      const pRes = await api.prd(id);
      setPrdData(pRes.prd);

      setStep("history");
      const hRes = await api.history(id);
      setHistoryData(hRes.result);

      setStep("lineage");
      const lRes = await api.lineage(id);
      setLineageData(lRes.result);

      setStep("conflict");
      const coRes = await api.conflict(id);
      setConflictData(coRes.result);

      setStep("done");
    } catch (e: any) {
      setError(e.message);
      setStep("idle");
    }
  };

  /* ── 自动管道（跳过口径追问，直接继续） ── */
  const runPipeline = useCallback(async (id: string) => {
    try {
      setStep("clarify");
      const cRes = await api.clarify(id);
      setClarifyData(cRes);

      // 自动跳过口径追问：有追问就自动回答空值，不打断分析师
      let s = cRes.state ?? {};
      let rounds = 0;
      while ((s.questions ?? []).length > 0 && rounds < 3) {
        const ans = await api.answerClarify(id, {});
        s = ans.state ?? {};
        rounds = s.round ?? rounds + 1;
      }
      setClarifyData({ state: s });

      await continuePipeline(id);
    } catch (e: any) {
      setError(e.message);
      setStep("idle");
    }
  }, []);

  /* ── 提交需求 ── */
  const submit = async () => {
    if (!text.trim()) return;
    setError(null);
    setStep("submitting");
    try {
      const res = await api.createRequirement(text.trim(), role || "analyst");
      setRid(res.requirement_id);
      setRequireData(res);
      await runPipeline(res.requirement_id);
    } catch (e: any) {
      setError(e.message);
      setStep("idle");
    }
  };

  /* ── 发布需求 ── */
  const publish = async () => {
    if (!rid) return;
    setPublishing(true);
    try {
      if (Object.keys(conflictDecisions).length > 0) {
        await api.resolveConflict(rid, conflictDecisions);
      }
      await api.publishRequirement(rid);
      setPublished(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  /* ── 加载已有需求 ── */
  const reloadRequirement = async (id: string) => {
    setError(null);
    setRid(id);
    setStep("submitting");
    try {
      const req = await api.getRequirement(id);
      setRequireData(req);
      setText(req.raw_text || "");
      const state = req.state || {};
      const artifactKinds = new Set((req.artifacts || []).map((a: any) => a.kind));

      if (artifactKinds.has("conflict") || state.conflict) {
        setConflictData(state.conflict);
        setClarifyData({ state });
        setPrdData(state.prd);
        setHistoryData(state.history);
        setLineageData(state.lineage);
        setStep("done");
      } else if (artifactKinds.has("lineage")) {
        setLineageData(state.lineage);
        setClarifyData({ state });
        setPrdData(state.prd);
        setHistoryData(state.history);
        setStep("lineage");
        const coRes = await api.conflict(id);
        setConflictData(coRes.result);
        setStep("done");
      } else if (artifactKinds.has("history")) {
        setHistoryData(state.history);
        setClarifyData({ state });
        setPrdData(state.prd);
        setStep("history");
        const lRes = await api.lineage(id);
        setLineageData(lRes.result);
        setStep("lineage");
        const coRes = await api.conflict(id);
        setConflictData(coRes.result);
        setStep("done");
      } else {
        await runPipeline(id);
      }
    } catch (e: any) {
      setError(e.message);
      setStep("idle");
    }
  };

  /* ── 保存口径编辑并重新分析 ── */
  const saveMetrics = async () => {
    if (!rid) return;
    setSavingMetrics(true);
    try {
      // 保存口径更新
      await api.confirmPrd(rid, prdEdits);
      setPrdEdits({});

      // 刷新 PRD 数据
      const pRes = await api.prd(rid);
      setPrdData(pRes.prd);

      // 重新运行相似指标扫描和冲突检测（口径变了，推荐也会变）
      const hRes = await api.history(rid);
      setHistoryData(hRes.result);

      const coRes = await api.conflict(rid);
      setConflictData(coRes.result);

      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingMetrics(false);
    }
  };

  /* ── URL 参数恢复 ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const existingRid = params.get("rid");
    if (existingRid) {
      reloadRequirement(existingRid);
    }
  }, []);

  /* ── 已发布检测 ── */
  useEffect(() => {
    if (requireData?.state?.published_at) {
      setPublished(true);
    }
  }, [requireData]);

  /* ── 侧边栏 ── */
  const STEP_LABELS: Record<string, string> = {
    clarify: "口径提取",
    prd: "PRD 生成",
    history: "相似指标扫描",
    lineage: "血缘分析",
    conflict: "冲突检测",
  };

  const rightSlot = (
    <div className="space-y-4">
      {rid && (
        <div className="card p-4 text-xs">
          <div className="font-medium text-slate-700 mb-3">分析进度</div>
          <div className="space-y-2">
            {(["clarify", "prd", "history", "lineage", "conflict"] as PipelineStep[]).map((s) => (
              <StepIndicator key={s} step={s} current={step} label={STEP_LABELS[s]} />
            ))}
          </div>
          {step === "done" && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-emerald-600 font-medium">✓ 所有分析已完成</div>
            </div>
          )}
        </div>
      )}
      <ComplianceCard />
      {rid && (
        <div className="card p-4 text-xs">
          <div className="font-medium text-slate-700 mb-2">需求信息</div>
          <div className="space-y-1 text-slate-500">
            <div>ID：<code className="text-slate-700">{rid.slice(0, 8)}...</code></div>
            <div>状态：{published ? "已发布" : step === "done" ? "分析完成" : "分析中"}</div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── 加载消息 ── */
  const LOADING_MSGS: Record<string, string> = {
    clarify: "正在提取指标口径...",
    prd: "正在生成结构化 PRD...",
    history: "正在匹配相似指标...",
    lineage: "正在生成数据血缘...",
    conflict: "正在检测口径冲突...",
  };

  return (
    <Layout current="input" noSidebar>
      {/* 提需求区域 */}
      {step === "idle" && !rid && (
        <>
          <section className="card p-6">
            <h2 className="text-lg font-semibold">提需求</h2>
            <p className="mt-1 text-sm text-slate-500">
              直接描述业务背景、目标和指标需求。提交后系统自动分析，展示相似口径和完整工作流。
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
            <div className="mt-5">
              <button className="btn-primary" onClick={submit} disabled={!text.trim()}>
                提交需求，开始分析
              </button>
              <span className="ml-3 text-xs text-slate-400">
                系统将自动完成澄清、PRD 生成、相似指标扫描、血缘分析和冲突检测
              </span>
            </div>
          </section>

          <section className="card p-6 mt-6">
            <h3 className="font-semibold mb-3">分析师工作流</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-md border border-brand-100 bg-brand-50 p-4">
                <div className="text-lg mb-1">📝</div>
                <div className="font-medium text-brand-700">提需求</div>
                <div className="mt-1 text-slate-600">用自然语言描述业务需求</div>
              </div>
              <div className="rounded-md border border-brand-100 bg-brand-50 p-4">
                <div className="text-lg mb-1">🔗</div>
                <div className="font-medium text-brand-700">看相似口径</div>
                <div className="mt-1 text-slate-600">自动匹配历史指标和复用建议</div>
              </div>
              <div className="rounded-md border border-brand-100 bg-brand-50 p-4">
                <div className="text-lg mb-1">📤</div>
                <div className="font-medium text-brand-700">发布需求</div>
                <div className="mt-1 text-slate-600">发布到公共看板，数仓开发接入</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              所有分析结果（PRD、血缘、冲突检测、dbt 代码等）在提交后一并展示，无需逐页切换。
            </p>
          </section>
        </>
      )}

      {/* 已提交 — 展示进度 + 结果 */}
      {step !== "idle" && (
        <div className="space-y-4">
          {/* 需求摘要 */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">需求摘要</h2>
              {rid && <code className="text-xs text-slate-400">#{rid.slice(0, 8)}</code>}
            </div>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`tag ${step === "done" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                {step === "done" ? "✓ 分析完成" : "分析中..."}
              </span>
              {error && <span className="tag bg-red-50 text-red-700 ring-red-200">错误：{error}</span>}
            </div>
          </section>

          {/* 加载中动画 — 对所有运行中的 steps 展示 */}
          {step !== "done" && (
            <div className="card p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full mx-auto" />
                <p className="mt-3 text-sm text-slate-500">{LOADING_MSGS[step] || "处理中..."}</p>
              </div>
            </div>
          )}

          {/* 分析完成后的完整展示 */}
          {step === "done" && (
            <>
              {/* 1. 相似口径指标（最突出） */}
              {historyData && (
                <CollapsibleSection title="相似口径指标" badge={`${historyData.candidates?.length || 0} 个匹配`} defaultOpen={true}>
                  {(!historyData.candidates || historyData.candidates.length === 0) ? (
                    <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
                      未找到相似历史资产，将走"新建模型"方案。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        扫描范围：{historyData.scanned.model_count} models · {historyData.scanned.metric_count} metrics · {historyData.scanned.exposure_count} exposures
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {historyData.candidates.slice(0, 4).map((c: any) => (
                          <MetricCard key={c.unique_id} candidate={c} />
                        ))}
                      </div>
                      {historyData.candidates.length > 4 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-brand-600 hover:text-brand-700 font-medium">
                            查看全部 {historyData.candidates.length} 个候选
                          </summary>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {historyData.candidates.slice(4).map((c: any) => (
                              <MetricCard key={c.unique_id} candidate={c} />
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </CollapsibleSection>
              )}

              {/* 2. PRD 预览 */}
              {prdData && (
                <CollapsibleSection title="PRD 预览" badge={`${prdData.confirmed_count || 0} 已确认 / ${prdData.pending_count || 0} 待确认`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {prdData.sections?.map((s: any) => (
                      <div key={s.key} className={`rounded-md border p-4 ${s.status === "confirmed" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-800">{s.label}</span>
                          <span className={`tag ring-1 ${s.status === "confirmed" ? "bg-white text-emerald-700 ring-emerald-300" : "bg-white text-amber-700 ring-amber-300"}`}>
                            {s.status === "confirmed" ? "已确认" : "待确认"}
                          </span>
                        </div>
                        <div className="text-slate-600">{s.value || s.hint || "—"}</div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* 3. 口径确认（可编辑） */}
              {prdData && prdData.sections && (
                <CollapsibleSection
                  title="口径确认"
                  badge={Object.keys(prdEdits).length > 0 ? `${Object.keys(prdEdits).length} 处修改待保存` : `${prdData.confirmed_count || 0} 个字段已确认`}
                  defaultOpen={true}
                >
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      确认或修改每个字段的口径值，修改后点击"保存口径"。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {prdData.sections.map((s: any) => {
                        const isConfirmed = s.status === "confirmed";
                        const editVal = prdEdits[s.key] ?? s.value ?? "";
                        return (
                          <div
                            key={s.key}
                            className={`rounded-md border p-3 ${
                              prdEdits[s.key] !== undefined
                                ? "border-brand-300 bg-brand-50"
                                : isConfirmed
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${
                                prdEdits[s.key] !== undefined ? "text-brand-600" : isConfirmed ? "text-emerald-600" : "text-amber-600"
                              }`}>{s.label}</span>
                              <span className={`tag ring-1 ${
                                prdEdits[s.key] !== undefined
                                  ? "bg-brand-100 text-brand-700 ring-brand-200"
                                  : isConfirmed
                                    ? "bg-white text-emerald-700 ring-emerald-300"
                                    : "bg-white text-amber-700 ring-amber-300"
                              }`}>
                                {prdEdits[s.key] !== undefined ? "已修改" : isConfirmed ? "已确认" : "待确认"}
                              </span>
                            </div>
                            <input
                              className={`w-full rounded-md border p-2 text-sm ${
                                prdEdits[s.key] !== undefined
                                  ? "border-brand-300 bg-white"
                                  : "border-slate-200 bg-white/50"
                              }`}
                              value={editVal}
                              placeholder={s.hint || "请输入口径值..."}
                              onChange={(e) => {
                                const newEdits = { ...prdEdits };
                                if (e.target.value === (s.value || "")) {
                                  delete newEdits[s.key];
                                } else {
                                  newEdits[s.key] = e.target.value;
                                }
                                setPrdEdits(newEdits);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        className="btn-primary"
                        disabled={savingMetrics || Object.keys(prdEdits).length === 0}
                        onClick={saveMetrics}
                      >
                        {savingMetrics ? "保存中..." : "保存口径"}
                      </button>
                      {Object.keys(prdEdits).length > 0 && (
                        <button
                          className="btn-secondary"
                          onClick={() => setPrdEdits({})}
                        >
                          撤销修改
                        </button>
                      )}
                      <span className="text-xs text-slate-400">
                        口径保存后，系统会重新分析相似指标和冲突
                      </span>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* 4. 数据血缘 */}
              {lineageData && (
                <CollapsibleSection title="数据血缘" badge={`${lineageData.upstream_count || 0} 上游 · ${lineageData.downstream_count || 0} 下游`}>
                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    for (const n of lineageData.graph?.nodes || []) {
                      grouped[n.layer] = grouped[n.layer] || [];
                      grouped[n.layer].push(n);
                    }
                    const LAYERS = ["source", "staging", "intermediate", "marts", "metrics", "exposures", "model"];
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          {LAYERS.filter((l) => grouped[l]?.length).map((layer) => (
                            <div key={layer} className="rounded-md border border-slate-200 p-3">
                              <div className={`tag ring-1 ${LAYER_COLORS[layer]}`}>{layer}</div>
                              <ul className="mt-2 space-y-1">
                                {grouped[layer].map((n: any) => (
                                  <li key={n.id} className="rounded-sm hover:bg-slate-50 px-2 py-1">
                                    <div className="font-mono text-xs text-slate-500">{n.id}</div>
                                    <div className="font-medium text-xs">{n.name}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          共 {lineageData.graph?.edges?.length || 0} 条依赖关系
                        </div>
                      </>
                    );
                  })()}
                </CollapsibleSection>
              )}

              {/* 5. 口径冲突 */}
              {conflictData && (
                <CollapsibleSection title="口径冲突" badge={`${conflictData.conflict_count || 0} 个冲突 · ${conflictData.high_count || 0} 高风险`} defaultOpen={(conflictData.conflict_count || 0) > 0}>
                  <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                    <div className="rounded-md border border-slate-200 p-3 bg-white">
                      <div className="text-xs text-slate-500">冲突总数</div>
                      <div className="text-xl font-semibold text-slate-700">{conflictData.conflict_count}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3 bg-white">
                      <div className="text-xs text-slate-500">高风险</div>
                      <div className={`text-xl font-semibold ${(conflictData.high_count || 0) > 0 ? "text-red-700" : "text-slate-700"}`}>{conflictData.high_count}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3 bg-white">
                      <div className="text-xs text-slate-500">中风险</div>
                      <div className={`text-xl font-semibold ${(conflictData.medium_count || 0) > 0 ? "text-amber-700" : "text-slate-700"}`}>{conflictData.medium_count}</div>
                    </div>
                  </div>
                  {(!conflictData.conflicts || conflictData.conflicts.length === 0) ? (
                    <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">未发现冲突，可直接发布。</div>
                  ) : (
                    <div className="space-y-3">
                      {conflictData.conflicts.map((c: any, i: number) => (
                        <div key={i} className="rounded-md border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`tag ring-1 ${LEVEL_COLORS[c.level]}`}>{c.level.toUpperCase()}</span>
                            <span className="text-sm font-medium">{c.type}</span>
                          </div>
                          <div className="text-sm text-slate-700">{c.message}</div>
                          <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(c.evidence, null, 2)}</pre>
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <span className="text-slate-500">人工裁决：</span>
                            {["accept", "reject", "ignore"].map((opt) => (
                              <label key={opt} className="inline-flex items-center gap-1">
                                <input type="radio" name={`conflict-${i}`} checked={conflictDecisions[c.asset] === opt} onChange={() => setConflictDecisions({ ...conflictDecisions, [c.asset]: opt })} />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              )}

              {/* 6. 发布需求 */}
              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">发布需求</h3>
                    <p className="text-xs text-slate-500 mt-1">发布后需求进入公共看板，数仓开发工程师可以接单开发。</p>
                  </div>
                  {published ? (
                    <span className="tag bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">✓ 已发布</span>
                  ) : (
                    <button className="btn-primary" disabled={publishing} onClick={publish}>
                      {publishing ? "发布中..." : "发布到需求看板"}
                    </button>
                  )}
                </div>
              </section>

              {/* 7. 数仓开发工作流预览 */}
              <CollapsibleSection title="数仓开发工作流（预览）">
                {published ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">需求已发布到看板，数仓开发工程师可从看板接单，进入以下开发流程：</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { icon: "🧱", title: "dbt 代码生成", desc: "AI 自动生成 model.sql、schema.yml、Join Key 推荐和基础 tests", path: "build" },
                        { icon: "✅", title: "验证数据", desc: "dbt build/test + SQL Diff + Root Cause 分析", path: "validate" },
                        { icon: "🚀", title: "上线建议", desc: "综合所有结果输出上线建议", path: "release" },
                      ].map((item) => (
                        <div key={item.path} className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
                          <div className="text-lg mb-1">{item.icon}</div>
                          <div className="font-medium text-emerald-700">{item.title}</div>
                          <div className="mt-1 text-xs text-slate-600">{item.desc}</div>
                          {rid && (
                            <button className="mt-3 btn-secondary text-xs" onClick={() => navigate(`/r/${rid}/${item.path}`)}>
                              查看详情
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                    发布需求后，此处将展示数仓开发工作流的预览。AI 将自动生成 dbt 代码、执行验证并给出上线建议。
                  </div>
                )}
              </CollapsibleSection>
            </>
          )}
        </div>
      )}

      {error && step === "idle" && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
    </Layout>
  );
}
