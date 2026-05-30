const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  health: () => request<any>("/health"),
  reloadDbt: () => request<any>("/dbt/reload", { method: "POST" }),
  requirementBoard: () => request<any>("/requirements?status=published"),
  createRequirement: (raw_text: string, role = "analyst") =>
    request<any>("/requirements", {
      method: "POST",
      body: JSON.stringify({ raw_text, role, user_id: role }),
    }),
  getRequirement: (rid: string) => request<any>(`/requirements/${rid}`),
  publishRequirement: (rid: string) => request<any>(`/requirements/${rid}/publish`, { method: "POST" }),
  clarify: (rid: string) => request<any>(`/requirements/${rid}/clarify`, { method: "POST" }),
  answerClarify: (rid: string, answers: Record<string, string>) =>
    request<any>("/requirements/clarify/answer", {
      method: "POST",
      body: JSON.stringify({ requirement_id: rid, answers }),
    }),
  prd: (rid: string) => request<any>(`/requirements/${rid}/prd`, { method: "POST" }),
  confirmPrd: (rid: string, edits?: Record<string, any>) =>
    request<any>("/requirements/prd/confirm", {
      method: "POST",
      body: JSON.stringify({ requirement_id: rid, edits }),
    }),
  history: (rid: string) => request<any>(`/requirements/${rid}/history`, { method: "POST" }),
  lineage: (rid: string, focus?: string) =>
    request<any>(`/requirements/${rid}/lineage${focus ? `?focus=${encodeURIComponent(focus)}` : ""}`, {
      method: "POST",
    }),
  conflict: (rid: string) => request<any>(`/requirements/${rid}/conflict`, { method: "POST" }),
  resolveConflict: (rid: string, decisions: Record<string, string>) =>
    request<any>("/requirements/conflict/resolve", {
      method: "POST",
      body: JSON.stringify({ requirement_id: rid, decisions }),
    }),
  build: (rid: string) => request<any>(`/requirements/${rid}/build`, { method: "POST" }),
  writeBuild: (rid: string) => request<any>(`/requirements/${rid}/build/write`, { method: "POST" }),
  validate: (rid: string, warehouse_available = true) =>
    request<any>(`/requirements/${rid}/validate?warehouse_available=${warehouse_available}`, {
      method: "POST",
    }),
  release: (rid: string, warehouse_available = true) =>
    request<any>(`/requirements/${rid}/release?warehouse_available=${warehouse_available}`, {
      method: "POST",
    }),
  artifacts: (rid: string) => request<any>(`/requirements/${rid}/artifacts`),
};
