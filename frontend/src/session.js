const ROLE_KEY = "data_dev_copilot_role";
export const ROLE_META = {
    analyst: { label: "分析师", homePath: "/analyst" },
    developer: { label: "数仓开发工程师", homePath: "/board" },
};
export function getRole() {
    const role = window.localStorage.getItem(ROLE_KEY);
    return role === "analyst" || role === "developer" ? role : null;
}
export function setRole(role) {
    window.localStorage.setItem(ROLE_KEY, role);
}
export function clearRole() {
    window.localStorage.removeItem(ROLE_KEY);
}
