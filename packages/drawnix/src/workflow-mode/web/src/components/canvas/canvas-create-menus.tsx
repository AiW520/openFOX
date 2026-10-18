import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImageIcon, List, Music2, Settings2, Video, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { isBuiltinNodeType, listNodeDefinitions, useNodeRegistryVersion } from "@/lib/canvas/node-registry";
import { CanvasNodeType, type ConnectionHandle, type Position } from "@/types/canvas";

export type PendingConnectionCreate = {
    connection: ConnectionHandle;
    position: Position;
};

function useMenuPlacement(position: Position, onClose: () => void) {
    const ref = useRef<HTMLDivElement>(null);
    const [point, setPoint] = useState(position);
    useLayoutEffect(() => {
        const menu = ref.current;
        const parent = menu?.parentElement;
        if (!menu || !parent) return;
        const place = () => {
            const bounds = parent.getBoundingClientRect();
            const rect = menu.getBoundingClientRect();
            const topbar = parent.querySelector(".workflow-canvas-topbar,.workflow-mobile-canvas-topbar")?.getBoundingClientRect();
            const top = Math.max(8, (topbar?.bottom ?? bounds.top) - bounds.top + 8);
            setPoint({ x: Math.max(8, Math.min(position.x, bounds.width - rect.width - 8)), y: Math.max(top, Math.min(position.y, bounds.height - rect.height - 8)) });
        };
        place();
        const observer = new ResizeObserver(place);
        observer.observe(parent);
        observer.observe(menu);
        return () => observer.disconnect();
    }, [position.x, position.y]);
    useEffect(() => {
        const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
        document.addEventListener("pointerdown", outside, true);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", escape); };
    }, [onClose]);
    return { ref, point };
}

export function ConnectionCreateMenu({
    pending,
    position = pending.position,
    onCreate,
    onClose,
}: {
    pending: PendingConnectionCreate;
    position?: Position;
    onCreate: (type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Config | CanvasNodeType.Video | CanvasNodeType.Audio) => void;
    onClose: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { t } = useTranslation();
    const { ref, point } = useMenuPlacement(position, onClose);
    return (
        <div
            ref={ref}
            className="absolute z-[120] max-h-[calc(100%-96px)] w-60 max-w-[calc(100%-16px)] overflow-y-auto rounded-lg border p-2 shadow-lg"
            data-connection-create-menu
            data-canvas-no-zoom
            style={{ left: point.x, top: point.y, background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
                    {t("canvas.createMenu.fromNode")}
                </span>
                <button type="button" className="grid size-7 place-items-center rounded-lg text-base opacity-55 transition hover:bg-white/10 hover:opacity-100" onClick={onClose} aria-label={t("canvas.createMenu.close")}>
                    <X className="size-4" />
                </button>
            </div>
            <div className="grid gap-1">
                <ConnectionCreateOption theme={theme} icon={<List className="size-5" />} title={t("canvas.createMenu.text")} description={t("canvas.createMenu.textDescription")} onClick={() => onCreate(CanvasNodeType.Text)} />
                <ConnectionCreateOption theme={theme} icon={<ImageIcon className="size-5" />} title={t("canvas.createMenu.image")} onClick={() => onCreate(CanvasNodeType.Image)} />
                <ConnectionCreateOption theme={theme} icon={<Video className="size-5" />} title={t("canvas.createMenu.video")} onClick={() => onCreate(CanvasNodeType.Video)} />
                <ConnectionCreateOption theme={theme} icon={<Music2 className="size-5" />} title={t("canvas.createMenu.audio")} onClick={() => onCreate(CanvasNodeType.Audio)} />
                <ConnectionCreateOption theme={theme} icon={<Settings2 className="size-5" />} title={t("canvas.createMenu.config")} description={t("canvas.createMenu.configDescription")} onClick={() => onCreate(CanvasNodeType.Config)} />
            </div>
        </div>
    );
}

export function ConnectionCreateOption({ theme, icon, title, description, onClick }: { theme: (typeof canvasThemes)[keyof typeof canvasThemes]; icon: React.ReactNode; title: string; description?: string; onClick?: () => void }) {
    return (
        <button
            type="button"
            className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left transition"
            style={{ color: theme.node.text }}
            onClick={onClick}
            onMouseEnter={(event) => (event.currentTarget.style.background = theme.node.fill)}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
        >
            <span className="grid size-6 shrink-0 place-items-center" style={{ color: theme.node.muted }}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium leading-5">{title}</span>
                {description ? (
                    <span className="mt-0.5 block break-words text-xs" style={{ color: theme.node.muted }}>
                        {description}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

export function NodeCreateMenu({ position, onCreate, onClose }: { position: Position; onCreate: (type: string) => void; onClose: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { t } = useTranslation();
    useNodeRegistryVersion();
    const { ref: menuRef, point } = useMenuPlacement(position, onClose);
    const definitions = listNodeDefinitions().filter((def) => def.showInCreateMenu !== false);
    return (
        <div
            ref={menuRef}
            className="absolute z-[120] max-h-[calc(100%-96px)] w-60 max-w-[calc(100%-16px)] overflow-y-auto rounded-lg border p-2 shadow-lg thin-scrollbar"
            data-canvas-no-zoom
            style={{ left: point.x, top: point.y, background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
                    {t("canvas.createMenu.select")}
                </span>
                <button type="button" className="grid size-7 place-items-center rounded-lg opacity-55 transition hover:opacity-100" onClick={onClose} aria-label={t("canvas.createMenu.close")}>
                    <X className="size-4" />
                </button>
            </div>
            <div className="grid gap-1">
                {definitions.map((def) => (
                    <ConnectionCreateOption key={def.type} theme={theme} icon={def.icon} title={isBuiltinNodeType(def.type) ? t(`canvas.nodeTypes.${def.type}`) : def.title} description={def.description} onClick={() => onCreate(def.type)} />
                ))}
            </div>
        </div>
    );
}
