import { ChevronDown, Minus, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Stepper = ({ label, value, onChange, step = 1, max, suffix, id }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-stone-300">{label}</span>
    <div className="flex items-center gap-2">
      <button type="button" data-testid={`${id}-minus`} className="step-btn"
        onClick={() => onChange(Math.max(0, value - step))}><Minus className="h-4 w-4" /></button>
      <span data-testid={`${id}-value`} className="w-16 text-center font-mono text-lg text-amber-400">
        {value}{suffix}
      </span>
      <button type="button" data-testid={`${id}-plus`} className="step-btn"
        onClick={() => onChange(Math.min(max, value + step))}><Plus className="h-4 w-4" /></button>
    </div>
  </div>
);

export const AdvancedStats = ({ open, setOpen, values, setValues }) => {
  const set = (k) => (v) => setValues({ ...values, [k]: v });
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="panel">
      <CollapsibleTrigger data-testid="advanced-stats-toggle" className="flex w-full items-center justify-between px-4 py-3">
        <span className="eyebrow !mb-0">Advanced stats (optional)</span>
        <ChevronDown className={`h-5 w-5 text-red-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-3">
        <Stepper id="adv-chase" label="Longest chase" value={values.chase_seconds} step={15} max={1800} suffix="s"
          onChange={set("chase_seconds")} />
        <Stepper id="adv-protection" label="Protection hits" value={values.protection_hits} max={30}
          onChange={set("protection_hits")} />
        <Stepper id="adv-unhooks" label="Safe unhooks" value={values.safe_unhooks} max={20}
          onChange={set("safe_unhooks")} />
      </CollapsibleContent>
    </Collapsible>
  );
};
