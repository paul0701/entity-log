import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRoster } from "@/hooks/useRoster";
import { PageHeader } from "@/components/Shell";
import { Portrait } from "@/components/Portrait";
import { plural } from "@/components/StatCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GlobalPage() {
  const { user } = useAuth();
  const { byId } = useRoster();
  const { data: lb } = useQuery({ queryKey: ["leaderboards"], queryFn: () => api.get("/leaderboards").then((r) => r.data), staleTime: 5 * 60_000 });

  return (
    <div data-testid="global-page">
      <PageHeader eyebrow={lb ? `Week ${lb.week_id.split("-W")[1]} · ${plural(lb.week_total, "trial")}` : "Community"} title="The Fog Report" />
      <div className="space-y-4 px-4">
        {user === false && (
          <Link to="/auth" data-testid="signin-cta" className="cta-banner fade-up">
            <span><b className="text-stone-100">Sign in to log matches.</b> Your trials feed these boards anonymously.</span>
            <span className="text-red-400">→</span>
          </Link>
        )}
        {lb?.most_sacrifices && (
          <div data-testid="most-sacrifices-card" className="panel panel-red flex items-center gap-4 p-4 fade-up">
            <Portrait character={byId[lb.most_sacrifices.character_id]} className="h-20 w-20 shrink-0" />
            <div>
              <p className="eyebrow flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> Most sacrifices this week</p>
              <p className="font-display text-xl font-bold text-stone-100">{byId[lb.most_sacrifices.character_id]?.name}</p>
              <p className="font-mono text-sm text-red-400">{plural(lb.most_sacrifices.kills_escapes, "sacrifice")}</p>
            </div>
          </div>
        )}
        <Tabs defaultValue="killers">
          <TabsList className="grid h-auto w-full grid-cols-3 bg-[#0F111A] p-1">
            <TabsTrigger data-testid="leaderboard-tab-killers" value="killers" className="lb-tab">Entity's Best</TabsTrigger>
            <TabsTrigger data-testid="leaderboard-tab-survivors" value="survivors" className="lb-tab">Survivors</TabsTrigger>
            <TabsTrigger data-testid="leaderboard-tab-pickrates" value="picks" className="lb-tab">Pick Rates</TabsTrigger>
          </TabsList>
          <TabsContent value="killers">
            <Board testId="board-killers" title="Kill rate · this week" rows={lb?.killers} byId={byId} metric={(r) => `${r.win_rate}%`} label="kill rate"
              sub={(r) => `${r.kills_escapes}/${r.total_encounters} sacrificed`} tone="red" min={lb?.min_sample} />
          </TabsContent>
          <TabsContent value="survivors" className="space-y-4">
            <Board testId="board-survivors-escapes" title="Most escapes · this week" rows={lb?.survivors_by_escapes} byId={byId}
              metric={(r) => r.kills_escapes.toLocaleString()} label="escapes" sub={(r) => plural(r.total_encounters, "trial")} tone="green" />
            <Board testId="board-survivors-rate" title="Best survival rate" rows={lb?.survivors_by_rate} byId={byId}
              metric={(r) => `${r.win_rate}%`} label="survival" sub={(r) => plural(r.total_encounters, "trial")} tone="green" min={lb?.min_sample} />
          </TabsContent>
          <TabsContent value="picks">
            <Board testId="board-pickrates" title="Most faced · rolling 7 days" rows={lb?.pick_rates} byId={byId}
              metric={(r) => `${r.pick_rate}%`} label="of trials" sub={(r) => plural(r.total_encounters, "encounter")} tone="amber" bar={(r) => r.pick_rate} />
          </TabsContent>
        </Tabs>
        <p data-testid="leaderboard-updated-at" className="text-center text-xs text-stone-500">
          Refreshed hourly{lb?.updated_at ? ` · last update ${new Date(lb.updated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : ""}
        </p>
      </div>
    </div>
  );
}

const RANK = ["rank-gold", "rank-silver", "rank-bronze"];
const TONE = { red: "text-red-400", green: "text-emerald-400", amber: "text-amber-400" };

const Board = ({ testId, title, rows, byId, metric, label, sub, tone, min, bar }) => (
  <section data-testid={testId} className="panel p-3">
    {title && <p className="eyebrow px-1 pt-1">{title}</p>}
    {!rows?.length ? (
      <p className="px-1 py-8 text-center text-sm text-stone-500">
        The fog is quiet. {min ? `Characters appear after ${min}+ logged trials this week.` : "No trials logged yet."}
      </p>
    ) : (
      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.character_id} data-testid={`${testId}-row-${r.character_id}`} className="lb-row fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <span className={`rank ${RANK[i] || ""}`}>{i + 1}</span>
            <Portrait character={byId[r.character_id]} className="h-11 w-11 shrink-0" rounded="rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-stone-100">{byId[r.character_id]?.name || r.character_id}</p>
              <p className="text-xs text-stone-500">{sub(r)}</p>
              {bar && <div className="mt-1 h-1 rounded-full bg-amber-950/60"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, bar(r))}%` }} /></div>}
            </div>
            <div className="text-right">
              <p className={`font-mono text-lg font-semibold ${TONE[tone]}`}>{metric(r)}</p>
              <p className="text-[10px] uppercase tracking-widest text-stone-600">{label}</p>
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
);
