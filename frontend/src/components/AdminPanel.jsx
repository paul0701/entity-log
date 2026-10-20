import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api, errorText } from "@/lib/api";
import { useRoster } from "@/hooks/useRoster";

export const AdminPanel = () => {
  const qc = useQueryClient();
  const { data } = useRoster();
  const toggle = useMutation({
    mutationFn: (v) => api.put("/admin/settings", { assets_enabled: v }),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["roster"] }); toast.success(v ? "Portraits enabled" : "Portraits disabled for everyone"); },
    onError: (e) => toast.error(errorText(e)),
  });
  const refresh = useMutation({
    mutationFn: () => api.post("/admin/aggregate"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaderboards"] }); toast.success("Leaderboards recalculated"); },
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <section data-testid="admin-panel" className="panel border-amber-500/30 p-4">
      <p className="eyebrow flex items-center gap-2 !text-amber-400"><ShieldAlert className="h-4 w-4" /> Admin controls</p>
      <div className="flex items-center justify-between gap-3 py-2">
        <div>
          <p className="text-sm font-semibold text-stone-200">Licensed portraits</p>
          <p className="text-xs text-stone-500">Turn off to show neutral name tiles for all users (IP takedown switch).</p>
        </div>
        <Switch data-testid="admin-killswitch-toggle" checked={!!data?.assets_enabled}
          disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate(v)} />
      </div>
      <button data-testid="admin-refresh-leaderboards-btn" onClick={() => refresh.mutate()} disabled={refresh.isPending}
        className="ghost-btn mt-2 w-full">
        <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} /> Recalculate leaderboards now
      </button>
    </section>
  );
};
