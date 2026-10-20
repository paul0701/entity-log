import { Portrait } from "@/components/Portrait";

export const RateRing = ({ rate, total }) => {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div data-testid="escape-rate-gauge" className="panel flex items-center gap-5 p-5">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="#1A1D2C" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="url(#ring)" strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * rate) / 100} style={{ transition: "stroke-dashoffset 900ms ease" }} />
        <defs><linearGradient id="ring"><stop offset="0" stopColor="#10B981" /><stop offset="1" stopColor="#F59E0B" /></linearGradient></defs>
      </svg>
      <div>
        <p className="eyebrow">Escape rate</p>
        <p data-testid="escape-rate-value" className="font-display text-5xl font-extrabold text-stone-100">{rate}<span className="text-2xl text-stone-400">%</span></p>
        <p data-testid="total-matches-value" className="text-sm text-stone-400">{plural(total, "trial")} logged</p>
      </div>
    </div>
  );
};

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const FeatureCard = ({ testId, label, character, headline, sub, tone }) => (
  <div data-testid={testId} className={`panel relative overflow-hidden p-3 ${tone === "red" ? "panel-red" : "panel-green"}`}>
    <p className="eyebrow">{label}</p>
    {character ? (
      <div className="flex flex-col gap-2">
        <Portrait character={character} className="aspect-square w-full max-w-[120px]" />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-tight text-stone-100">{character.name}</p>
          <p className={`font-mono text-sm ${tone === "red" ? "text-red-400" : "text-emerald-400"}`}>{headline}</p>
          <p className="text-xs text-stone-500">{sub}</p>
        </div>
      </div>
    ) : <p className="py-4 text-sm text-stone-500">Not enough trials yet.</p>}
  </div>
);
