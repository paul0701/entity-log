import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Portrait } from "@/components/Portrait";

export const MatchHistory = ({ byId }) => {
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const [confirmId, setConfirmId] = useState(null);
  const { data = [] } = useQuery({ queryKey: ["matches"], queryFn: () => api.get("/matches?limit=20").then((r) => r.data) });
  const del = useMutation({
    mutationFn: (id) => api.delete(`/matches/${id}`),
    onSuccess: () => {
      toast.success("Trial removed");
      setConfirmId(null);
      setUser({ ...user, total_matches: Math.max(0, (user.total_matches || 0) - 1) });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <section data-testid="match-history" className="panel p-4">
      <p className="eyebrow">Recent trials</p>
      {data.length === 0 && <p className="py-4 text-sm text-stone-500">No trials logged yet.</p>}
      <ul className="divide-y divide-red-950/40">
        {data.map((m) => (
          <li key={m.match_id} data-testid={`match-row-${m.match_id}`} className="flex items-center gap-3 py-2.5">
            <Portrait character={byId[m.killer_id]} className="h-10 w-10 shrink-0" rounded="rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-200">{byId[m.killer_id]?.name} <span className="text-stone-500">vs</span> {byId[m.survivor_id]?.name}</p>
              <p className="text-xs text-stone-500">{new Date(m.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <span className={`pill ${m.outcome ? "pill-green" : "pill-red"}`}>{m.outcome ? "Escaped" : "Sacrificed"}</span>
            <button data-testid={`delete-match-${m.match_id}`} aria-label="Delete trial"
              onClick={() => (confirmId === m.match_id ? del.mutate(m.match_id) : setConfirmId(m.match_id))}
              className={`icon-btn ${confirmId === m.match_id ? "bg-red-700 text-white" : ""}`}>
              {confirmId === m.match_id ? <span className="px-1 text-[10px] font-bold">SURE?</span> : <Trash2 className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
