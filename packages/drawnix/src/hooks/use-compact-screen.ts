import { useEffect, useState } from "react";

const COMPACT_QUERY = "(max-width: 767px), (pointer: coarse) and (max-width: 1023px) and (max-height: 500px)";

function readCompactScreen() {
    return typeof window !== "undefined" && Boolean(window.matchMedia?.(COMPACT_QUERY).matches);
}

export function useCompactScreen() {
    const [compact, setCompact] = useState(readCompactScreen);

    useEffect(() => {
        if (!window.matchMedia) return;
        const media = window.matchMedia(COMPACT_QUERY);
        const update = () => setCompact(media.matches);
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, []);

    return compact;
}

export { COMPACT_QUERY };
