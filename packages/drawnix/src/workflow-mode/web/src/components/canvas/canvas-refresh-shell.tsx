import { LoaderCircle } from 'lucide-react';

export function CanvasRefreshShell() {
    return (
        <main className="relative h-full min-h-0 overflow-hidden bg-background text-foreground" role="status" aria-live="polite" aria-label="正在恢复画布数据">
            <div
                className="absolute inset-0 opacity-60"
                style={{
                    backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />

            <div className="relative flex h-full items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
                <LoaderCircle size={18} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>正在恢复画布数据...</span>
            </div>
        </main>
    );
}
