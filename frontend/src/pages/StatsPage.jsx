import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRoster } from "@/hooks/useRoster";
import { PageHeader } from "@/components/Shell";
import { RateRing, FeatureCard, plural } from "@/components/StatCards";
import { TrendChart } from "@/components/TrendChart";
import { MatchHistory } from "@/components/MatchHistory";
import { AdminPanel } from "@/components/AdminPanel";
import { Portrait } from "@/components/Portrait";

export default function StatsPage() {
  const { user, logout } = useAuth();
  const { byId } = useRoster();
  const { data: s, isLoading } = useQuery({ queryKey: ["stats"], queryFn: () => api.get("/me/stats").then((r) => r.data) });

  return (
    <div data-testid="stats-page">
      <PageHeader eyebrow={user?.email} title="My Stats" right={
        <button data-testid="logout-button" onClick={logout} className="icon-btn" aria-label="Log out"><LogOut className="h-5 w-5" /></button>
      } />
      {isLoading || !s ? <p className="px-4 text-stone-500">Reading the ledger...</p> : (
        <div className="space-y-4 px-4">
          <RateRing rate={s.escape_rate} total={s.total_matches} />
          <div className="grid grid-cols-2 gap-3">
            <FeatureCard testId="nemesis-card" label="Nemesis" tone="red" character={byId[s.nemesis?.killer_id]}
              headline={s.nemesis && plural(s.nemesis.deaths, "sacrifice")} sub={s.nemesis && `${s.nemesis.escape_rate}% escape vs them`} />
            <FeatureCard testId="best-survivor-card" label="Best survivor" tone="green" character={byId[s.best_survivor?.survivor_id]}
              headline={s.best_survivor && `${s.best_survivor.escape_rate}% escapes`} sub={s.best_survivor && plural(s.best_survivor.matches, "trial")} />
          </div>
          <TrendChart data={s.trend} />
          <KillerBreakdown rows={s.killer_breakdown} byId={byId} />
          <MatchHistory byId={byId} />
          {user?.role === "admin" && <AdminPanel />}
        </div>
      )}
    </div>
  );
}

const KillerBreakdown = ({ rows, byId }) => (
  <section data-testid="killer-breakdown" className="panel p-4">
    <p className="eyebrow">Per-killer breakdown</p>
    {rows.length === 0 && <p className="py-4 text-sm text-stone-500">Nothing yet. Go survive something.</p>}
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.killer_id} data-testid={`breakdown-row-${r.killer_id}`} className="flex items-center gap-3">
          <Portrait character={byId[r.killer_id]} className="h-9 w-9 shrink-0" rounded="rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm">
              <span className="truncate text-stone-200">{byId[r.killer_id]?.name}</span>
              <span className="font-mono text-stone-400">{r.escapes}/{r.matches} esc</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-red-950/60">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400" style={{ width: `${r.escape_rate}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  </section>
);
