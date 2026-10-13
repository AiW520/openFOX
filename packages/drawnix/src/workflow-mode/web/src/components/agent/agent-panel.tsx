import { lazy, Suspense, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { canvasThemes } from "@/lib/canvas-theme";
import { CANVAS_AGENT_PANEL_MOTION_MS, useAgentStore } from "@/stores/use-agent-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";
import { useCompactScreen } from "@/hooks/use-compact-screen";

const PANEL_MOTION_SECONDS = CANVAS_AGENT_PANEL_MOTION_MS / 1000;
const LocalAgentPanel = lazy(() => import("./local-agent-panel").then(module => ({ default: module.LocalAgentPanel })));

export function AgentPanel() {
    const compactScreen = useCompactScreen();
    const { t } = useTranslation();
    const { hash, search } = useLocation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const width = useAgentStore((state) => state.width);
    const [resizing, setResizing] = useState(false);
    const panelMounted = useAgentStore((state) => state.panelMounted);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const panelClosing = useAgentStore((state) => state.panelClosing);
    const enabled = useAgentStore((state) => state.enabled);
    const fragmentBootstrap = useAgentStore((state) => state.fragmentBootstrap);
    const searchParams = new URLSearchParams(search);
    const autoConnect = (searchParams.has("agentUrl") && searchParams.has("agentToken")) || hasAgentUrlBootstrap(hash);
    const needsPanel = panelOpen || enabled || fragmentBootstrap || autoConnect;
    const [panelRequested, setPanelRequested] = useState(needsPanel);
    useEffect(() => {
        if (needsPanel) setPanelRequested(true);
    }, [needsPanel]);
    const setAgentState = useAgentStore((state) => state.setAgentState);
    const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        let nextWidth = startWidth;
        const onMove = (moveEvent: PointerEvent) => {
            nextWidth = Math.min(760, Math.max(360, startWidth + startX - moveEvent.clientX));
            setAgentState({ width: nextWidth });
        };
        const onUp = () => {
            localStorage.setItem("canvas-agent-panel-width", String(nextWidth));
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    if (!panelMounted || !panelRequested) return null;

    return (
        <motion.div
            className="workflow-agent-panel relative z-[70] flex h-full shrink-0"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelOpen ? (compactScreen ? window.innerWidth : width + 1) : 0, opacity: panelOpen ? 1 : 0 }}
            transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "clip", pointerEvents: panelOpen && !panelClosing ? undefined : "none" }}
        >
            <motion.aside
                className="relative flex h-full shrink-0 flex-col border-l"
                data-canvas-shortcuts-ignore
                initial={{ x: 48 }}
                animate={{ x: panelClosing ? 28 : 0 }}
                transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: compactScreen ? window.innerWidth : width, background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
            >
                <button type="button" className="absolute inset-y-0 left-0 z-40 w-4 -translate-x-1/2 cursor-col-resize" onPointerDown={startResize} aria-label={t("agent.panel.resize")} />
                <Suspense fallback={<div className="workflow-route-loading" role="status">正在加载助手...</div>}><LocalAgentPanel embedded /></Suspense>
            </motion.aside>
        </motion.div>
    );
}
