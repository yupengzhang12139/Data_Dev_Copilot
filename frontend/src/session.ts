export type UserRole = "analyst" | "developer";

const ROLE_KEY = "data_dev_copilot_role";

export const ROLE_META: Record<UserRole, { label: string; homePath: string }> = {
  analyst: { label: "分析师", homePath: "/analyst" },
  developer: { label: "数仓开发工程师", homePath: "/board" },
};

export function getRole(): UserRole | null {
  const role = window.localStorage.getItem(ROLE_KEY);
  return role === "analyst" || role === "developer" ? role : null;
}

export function setRole(role: UserRole) {
  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearRole() {
  window.localStorage.removeItem(ROLE_KEY);
}
