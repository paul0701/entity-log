import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Portrait } from "@/components/Portrait";

export const CharacterGrid = ({ items, selectedId, onSelect, kind, layout = "grid" }) => {
  const [q, setQ] = useState("");
  const rowRef = useRef(null);
  useEffect(() => {
    if (layout !== "row" || !selectedId) return;
    const el = rowRef.current?.querySelector(`[data-testid="${kind}-card-${selectedId}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [layout, kind, selectedId]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((c) => c.name.toLowerCase().includes(s)) : items;
  }, [items, q]);

  return (
    <div>
      <label className="search-box">
        <Search className="h-4 w-4 text-stone-500" />
        <input data-testid={`${kind}-search-input`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${kind}s`} className="flex-1 bg-transparent outline-none placeholder:text-stone-600" />
      </label>
      <div ref={rowRef} className={layout === "row" ? "char-row" : "char-grid"}>
        {list.map((c) => {
          const active = c.id === selectedId;
          return (
            <button key={c.id} type="button" data-testid={`${kind}-card-${c.id}`} onClick={() => onSelect(c.id)}
              className={`char-card ${active ? "char-card-active" : ""} ${layout === "row" ? "w-[76px] shrink-0" : ""}`}>
              <Portrait character={c} className="aspect-square w-full" />
              <span className="char-name">{c.name.replace(/^The\s+/, "")}</span>
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-4 py-6 text-center text-sm text-stone-500">No match.</p>}
      </div>
    </div>
  );
};
