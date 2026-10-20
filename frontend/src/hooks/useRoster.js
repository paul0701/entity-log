import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRoster() {
  const q = useQuery({
    queryKey: ["roster"],
    queryFn: () => api.get("/roster").then((r) => r.data),
    staleTime: 10 * 60_000,
  });
  const byId = useMemo(() => {
    const map = {};
    [...(q.data?.killers || []), ...(q.data?.survivors || [])].forEach((c) => { map[c.id] = c; });
    return map;
  }, [q.data]);

  useEffect(() => {
    if (!q.data?.assets_enabled || !navigator.serviceWorker?.controller) return;
    const urls = [...q.data.killers, ...q.data.survivors].map((c) => c.image).filter(Boolean);
    navigator.serviceWorker.controller.postMessage({ type: "PRECACHE", urls });
  }, [q.data]);

  return { ...q, byId };
}
