import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DoorOpen, Skull } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRoster } from "@/hooks/useRoster";
import { PageHeader } from "@/components/Shell";
import { CharacterGrid } from "@/components/CharacterGrid";
import { AdvancedStats } from "@/components/AdvancedStats";

const EMPTY_ADV = { chase_seconds: 0, protection_hits: 0, safe_unhooks: 0 };

export default function LogPage() {
  const { user, setUser } = useAuth();
  const { data, byId, isLoading } = useRoster();
  const qc = useQueryClient();
  const [killerId, setKillerId] = useState(null);
  const [survivorId, setSurvivorId] = useState(user?.last_survivor_id || null);
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState(EMPTY_ADV);

  useEffect(() => { if (!survivorId && user?.last_survivor_id) setSurvivorId(user.last_survivor_id); }, [user, survivorId]);

  const log = useMutation({
    mutationFn: (outcome) => api.post("/matches", {
      killer_id: killerId, survivor_id: survivorId, outcome, advanced: advOpen ? adv : null,
    }).then((r) => r.data),
    onSuccess: (m) => {
      toast.success(m.outcome ? "Escaped. Logged." : "Sacrificed. Logged.", {
        description: `${byId[m.killer_id]?.name} vs ${byId[m.survivor_id]?.name}`,
      });
      setUser({ ...user, last_survivor_id: m.survivor_id, total_matches: (user.total_matches || 0) + 1 });
      setKillerId(null); setAdv(EMPTY_ADV); setAdvOpen(false);
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const ready = killerId && survivorId && !log.isPending;
  const killer = byId[killerId], survivor = byId[survivorId];

  return (
    <div data-testid="log-page">
      <PageHeader eyebrow={`Trial #${(user?.total_matches || 0) + 1}`} title="Log the trial" />
      {isLoading || !data ? <p className="px-4 text-stone-500">Summoning the roster...</p> : (
        <div className="space-y-6 px-4">
          <section className="fade-up" style={{ animationDelay: "60ms" }}>
            <StepLabel n={1} text="You played" value={survivor?.name} />
            <CharacterGrid kind="survivor" layout="row" items={data.survivors} selectedId={survivorId} onSelect={setSurvivorId} />
          </section>
          <section className="fade-up" style={{ animationDelay: "120ms" }}>
            <StepLabel n={2} text="Who hunted you?" value={killer?.name} />
            <CharacterGrid kind="killer" items={data.killers} selectedId={killerId} onSelect={setKillerId} />
          </section>
          <AdvancedStats open={advOpen} setOpen={setAdvOpen} values={adv} setValues={setAdv} />
          <section className="sticky bottom-[84px] z-20 -mx-4 bg-gradient-to-t from-[#07080C] via-[#07080C]/95 to-transparent px-4 pb-2 pt-6">
            <StepLabel n={3} text="Outcome" />
            <div className="grid grid-cols-2 gap-3">
              <button data-testid="outcome-escaped-btn" disabled={!ready} onClick={() => log.mutate(true)} className="outcome-btn outcome-escaped">
                <DoorOpen className="h-7 w-7" /> Escaped
              </button>
              <button data-testid="outcome-sacrificed-btn" disabled={!ready} onClick={() => log.mutate(false)} className="outcome-btn outcome-sacrificed">
                <Skull className="h-7 w-7" /> Sacrificed
              </button>
            </div>
            {!(killerId && survivorId) && (
              <p data-testid="log-hint" className="mt-2 text-center text-xs text-stone-500">
                {killerId ? "Pick your survivor to unlock the outcome." : "Pick a killer to unlock the outcome."}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const StepLabel = ({ n, text, value }) => (
  <div className="mb-2 flex items-baseline justify-between">
    <p className="eyebrow !mb-0"><span className="text-amber-400">0{n}</span> / {text}</p>
    {value && <span data-testid={`step-${n}-value`} className="truncate pl-2 text-sm font-semibold text-stone-200">{value}</span>}
  </div>
);
