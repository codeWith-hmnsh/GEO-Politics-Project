"use client";

import { Globe2 } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import glossary from "@/data/curated/glossary.json";
import { usePulse } from "@/lib/api";
import { loadCountries } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";

export type GlossaryTerm = {
  id: string;
  term: string;
  group: string;
  def: string;
  related: string[];
  org?: string;
  members?: string[];
  place?: number[];
};

export const TERMS = glossary.terms as GlossaryTerm[];
export const termById = (id: string) => TERMS.find((t) => t.id === id);

/** "See on globe": tint a bloc, light up members, or fly to a place. */
export function useSeeOnGlobe() {
  const { data: pulse } = usePulse();
  return async (t: GlossaryTerm) => {
    const s = useGlobe.getState();
    if (s.mode !== "home") s.setMode("home");
    const org = t.org ? pulse?.data.organizations.find((o) => o.id === t.org) : undefined;
    if (org) {
      s.selectOrg(org.id);
      s.flyTo({ lat: org.pin[0], lng: org.pin[1], dist: 3.2 });
      return;
    }
    if (t.members?.length) {
      s.setHighlight(t.members);
      const countries = await loadCountries();
      const first = countries.find((c) => c.iso3 === t.members![0]);
      if (first) s.flyTo({ lat: first.centroid[0], lng: first.centroid[1], dist: 3.2 });
      return;
    }
    if (t.place) {
      s.closePanel();
      s.flyTo({ lat: t.place[0], lng: t.place[1], dist: 2 });
    }
  };
}

export const canSee = (t: GlossaryTerm) => !!(t.org || t.members?.length || t.place);

/** Underlined glossary chip: tap for a 2-line definition, related terms and "See on globe" (PRD §6). */
export function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const [currentId, setCurrentId] = useState(id);
  const see = useSeeOnGlobe();
  const base = termById(id);
  const t = termById(currentId) ?? base;
  if (!base || !t) return <>{children}</>;
  return (
    <Popover onOpenChange={(open) => open && setCurrentId(id)}>
      <PopoverTrigger className="cursor-help underline decoration-dotted decoration-[1.5px] underline-offset-[3px] hover:decoration-solid focus-visible:rounded focus-visible:outline-2">
        {children ?? base.term}
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" collisionPadding={12}>
        <div className="text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">{t.group}</div>
        <div className="mt-0.5 text-base font-bold">{t.term}</div>
        <p className="mt-1 leading-relaxed text-ink-2">{t.def}</p>
        {canSee(t) && (
          <button
            type="button"
            onClick={() => see(t)}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-strong)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Globe2 className="size-3.5" aria-hidden />
            See on globe
          </button>
        )}
        {t.related.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-3">Related:</span>
            {t.related.map((r) => (
              <button key={r} type="button" onClick={() => setCurrentId(r)} className="rounded-full border border-border px-2 py-0.5 font-semibold hover:bg-paper">
                {termById(r)?.term ?? r}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
