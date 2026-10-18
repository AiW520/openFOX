import { nanoid } from "nanoid";
import type { CanvasConnection, CanvasNodeData, Position } from "@/types/canvas";

export function cloneCanvasNodes(sources: CanvasNodeData[], connections: CanvasConnection[], availableIds: Set<string>, offset: Position) {
    const nodeIds = new Map(sources.map(node => [node.id, nanoid()]));
    const nodes = sources.map(source => {
        const metadata = source.metadata ? structuredClone(source.metadata) : undefined;
        if (metadata) {
            // Outputs can share stored bytes; running work must retain a single owner.
            delete metadata.workflowTasks;
            delete metadata.videoTaskId;
            delete metadata.videoTaskProvider;
            delete metadata.videoTaskProtocol;
            delete metadata.videoTaskTuziCredential;
            metadata.groupId = metadata.groupId ? nodeIds.get(metadata.groupId) : undefined;
            const slotIds = new Map<string, string>();
            metadata.images = metadata.images?.map(image => {
                const id = nanoid();
                slotIds.set(image.id, id);
                const { enhancement, enhancementEligibleAt, ...output } = image;
                return { ...output, id, status: image.status === "loading" ? image.content || image.storageKey ? "success" as const : "idle" as const : image.status, errorDetails: image.status === "loading" ? undefined : image.errorDetails };
            });
            metadata.texts = metadata.texts?.map(text => {
                const id = nanoid();
                slotIds.set(text.id, id);
                return { ...text, id, status: text.status === "loading" ? text.content ? "success" as const : "idle" as const : text.status, errorDetails: text.status === "loading" ? undefined : text.errorDetails };
            });
            metadata.primaryImageId = metadata.primaryImageId ? slotIds.get(metadata.primaryImageId) : undefined;
            metadata.primaryTextId = metadata.primaryTextId ? slotIds.get(metadata.primaryTextId) : undefined;
            // Single-image nodes can also carry enhancement state on metadata.
            delete (metadata as Record<string, unknown>).enhancement;
            delete (metadata as Record<string, unknown>).enhancementEligibleAt;
            if (metadata.status === "loading") {
                metadata.status = metadata.content || metadata.storageKey ? "success" : "idle";
                delete metadata.errorDetails;
            }
        }
        return { ...source, id: nodeIds.get(source.id)!, title: source.title.endsWith(" Copy") ? source.title : `${source.title} Copy`, position: { x: source.position.x + offset.x, y: source.position.y + offset.y }, metadata };
    });
    const seen = new Set<string>();
    const copiedConnections = connections.flatMap(connection => {
        const toNodeId = nodeIds.get(connection.toNodeId);
        const fromNodeId = nodeIds.get(connection.fromNodeId) || (availableIds.has(connection.fromNodeId) ? connection.fromNodeId : undefined);
        if (!toNodeId || !fromNodeId || fromNodeId === toNodeId) return [];
        const key = `${fromNodeId}:${toNodeId}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ ...connection, id: nanoid(), fromNodeId, toNodeId }];
    });
    return { nodes, connections: copiedConnections };
}
