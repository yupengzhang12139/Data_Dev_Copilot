import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { InputPage } from "./pages/InputPage";
import { ClarifyPage } from "./pages/ClarifyPage";
import { PrdPage } from "./pages/PrdPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LineagePage } from "./pages/LineagePage";
import { ConflictPage } from "./pages/ConflictPage";
import { BuildPage } from "./pages/BuildPage";
import { ValidatePage } from "./pages/ValidatePage";
import { ReleasePage } from "./pages/ReleasePage";
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(InputPage, {}) }), _jsx(Route, { path: "/r/:rid", element: _jsx(Navigate, { to: "clarify", replace: true }) }), _jsx(Route, { path: "/r/:rid/clarify", element: _jsx(ClarifyPage, {}) }), _jsx(Route, { path: "/r/:rid/prd", element: _jsx(PrdPage, {}) }), _jsx(Route, { path: "/r/:rid/history", element: _jsx(HistoryPage, {}) }), _jsx(Route, { path: "/r/:rid/lineage", element: _jsx(LineagePage, {}) }), _jsx(Route, { path: "/r/:rid/conflict", element: _jsx(ConflictPage, {}) }), _jsx(Route, { path: "/r/:rid/build", element: _jsx(BuildPage, {}) }), _jsx(Route, { path: "/r/:rid/validate", element: _jsx(ValidatePage, {}) }), _jsx(Route, { path: "/r/:rid/release", element: _jsx(ReleasePage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
