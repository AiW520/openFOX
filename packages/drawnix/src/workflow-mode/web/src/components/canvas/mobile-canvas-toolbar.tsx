import { useState } from "react";
import { Drawer, Segmented, Switch, Tooltip } from "antd";
import { Group, Hand, Image, MoreHorizontal, MousePointer2, Music2, Palette, Plus, Redo2, Settings2, Trash2, Type, Undo2, Upload, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { getNodePluginId, listNodeDefinitions } from "@/lib/canvas/node-registry";
import type { CanvasToolbarProps } from "./canvas-toolbar";
import { workflowRoot } from "@/integration/workflow-dom";

export function MobileCanvasToolbar(props: CanvasToolbarProps) {
    const { t } = useTranslation();
    const [panel, setPanel] = useState<"add" | "more" | null>(null);
    const colorTheme = useThemeStore(state => state.theme);
    const setTheme = useThemeStore(state => state.setTheme);
    const theme = canvasThemes[colorTheme];
    const closeOverlays = () => window.dispatchEvent(new CustomEvent("opentu:workflow:close-overlays"));
    const tools: { key: string; icon: LucideIcon; label: string; action: () => void; disabled?: boolean }[] = [
        { key: "add", icon: Plus, label: t("canvas.create"), action: () => { closeOverlays(); setPanel("add"); } },
        { key: "pan", icon: props.canvasTool === "pan" ? Hand : MousePointer2, label: t(`canvas.toolbar.${props.canvasTool}`), action: () => props.onCanvasToolChange(props.canvasTool === "pan" ? "select" : "pan") },
        { key: "undo", icon: Undo2, label: t("canvas.undo"), action: props.onUndo, disabled: !props.canUndo },
        { key: "redo", icon: Redo2, label: t("canvas.redo"), action: props.onRedo, disabled: !props.canRedo },
        { key: "upload", icon: Upload, label: t("canvas.toolbar.upload"), action: props.onUpload },
        { key: "more", icon: MoreHorizontal, label: t("canvas.imageTools.more"), action: () => setPanel("more") },
    ];
    const addTools = [
        { icon: Image, label: t("canvas.toolbar.image"), action: props.onAddImage },
        { icon: Type, label: t("canvas.toolbar.text"), action: props.onAddText },
        { icon: Video, label: t("canvas.toolbar.video"), action: props.onAddVideo },
        { icon: Music2, label: t("canvas.toolbar.audio"), action: props.onAddAudio },
        { icon: Settings2, label: t("canvas.toolbar.config"), action: props.onAddConfig },
        { icon: Group, label: t("canvas.toolbar.group"), action: props.onAddGroup },
    ];
    const run = (action: () => void) => { setPanel(null); action(); };
    return <>
        <div className="workflow-mobile-dock" role="toolbar" aria-label="画布工具" style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item }}>
            {tools.map(({ key, icon: Icon, label, action, disabled }) => <Tooltip key={key} title={label}><button type="button" aria-label={label} title={label} disabled={disabled} onClick={action} className={key === "add" ? "is-primary" : undefined}><Icon size={21} /></button></Tooltip>)}
        </div>
        <Drawer getContainer={workflowRoot} rootClassName="workflow-mobile-drawer" title={panel === "add" ? t("canvas.create") : t("canvas.imageTools.more")} placement="bottom" height="auto" open={Boolean(panel)} onClose={() => setPanel(null)}>
            {panel === "add" ? <div className="workflow-mobile-tool-grid">
                {addTools.map(({ icon: Icon, label, action }) => <button key={label} type="button" onClick={() => run(action)}><Icon size={23} /><span>{label}</span></button>)}
                {listNodeDefinitions().filter(def => def.showInCreateMenu !== false && getNodePluginId(def.type) !== "builtin").map(def => <button key={def.type} type="button" onClick={() => run(() => props.onAddExtensionNode(def.type))}>{def.icon}<span>{def.title}</span></button>)}
            </div> : <div className="workflow-mobile-more">
                <label><Palette size={18} /><span>{t("canvas.toolbar.themeMode")}</span><Switch checked={colorTheme === "dark"} onChange={dark => setTheme(dark ? "dark" : "light")} /></label>
                <Segmented block value={props.backgroundMode} onChange={value => props.onBackgroundModeChange(value as CanvasToolbarProps["backgroundMode"])} options={[{ value: "dots", label: t("canvas.toolbar.dots") }, { value: "lines", label: t("canvas.toolbar.lines") }, { value: "blank", label: t("canvas.toolbar.blank") }]} />
                <label><span>{t("canvas.toolbar.imageInfo")}</span><Switch checked={props.showImageInfo} onChange={props.onShowImageInfoChange} /></label>
                <button type="button" disabled={!props.selectedCount} onClick={() => run(props.onDelete)}><Trash2 size={18} />{t("canvas.deleteSelected")}</button>
                <button type="button" onClick={() => run(props.onClear)}><Trash2 size={18} />{t("canvas.toolbar.clear")}</button>
            </div>}
        </Drawer>
    </>;
}
