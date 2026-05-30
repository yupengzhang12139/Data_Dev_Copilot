const BASE = "/api";
async function request(path, init) {
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
    health: () => request("/health"),
    reloadDbt: () => request("/dbt/reload", { method: "POST" }),
    requirementBoard: () => request("/requirements?status=published"),
    createRequirement: (raw_text, role = "analyst") => request("/requirements", {
        method: "POST",
        body: JSON.stringify({ raw_text, role, user_id: role }),
    }),
    getRequirement: (rid) => request(`/requirements/${rid}`),
    publishRequirement: (rid) => request(`/requirements/${rid}/publish`, { method: "POST" }),
    clarify: (rid) => request(`/requirements/${rid}/clarify`, { method: "POST" }),
    answerClarify: (rid, answers) => request("/requirements/clarify/answer", {
        method: "POST",
        body: JSON.stringify({ requirement_id: rid, answers }),
    }),
    prd: (rid) => request(`/requirements/${rid}/prd`, { method: "POST" }),
    confirmPrd: (rid, edits) => request("/requirements/prd/confirm", {
        method: "POST",
        body: JSON.stringify({ requirement_id: rid, edits }),
    }),
    history: (rid) => request(`/requirements/${rid}/history`, { method: "POST" }),
    lineage: (rid, focus) => request(`/requirements/${rid}/lineage${focus ? `?focus=${encodeURIComponent(focus)}` : ""}`, {
        method: "POST",
    }),
    conflict: (rid) => request(`/requirements/${rid}/conflict`, { method: "POST" }),
    resolveConflict: (rid, decisions) => request("/requirements/conflict/resolve", {
        method: "POST",
        body: JSON.stringify({ requirement_id: rid, decisions }),
    }),
    build: (rid) => request(`/requirements/${rid}/build`, { method: "POST" }),
    writeBuild: (rid) => request(`/requirements/${rid}/build/write`, { method: "POST" }),
    validate: (rid, warehouse_available = true) => request(`/requirements/${rid}/validate?warehouse_available=${warehouse_available}`, {
        method: "POST",
    }),
    release: (rid, warehouse_available = true) => request(`/requirements/${rid}/release?warehouse_available=${warehouse_available}`, {
        method: "POST",
    }),
    artifacts: (rid) => request(`/requirements/${rid}/artifacts`),
};
