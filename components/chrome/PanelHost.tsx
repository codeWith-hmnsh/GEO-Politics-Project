"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";

/** Right panel on desktop, bottom sheet on phones. M1.2 shows the country shell; content arrives with data. */
export function PanelHost() {
  const iso3 = useGlobe((s) => s.selectedIso3);
  const select = useGlobe((s) => s.select);
  const [countries, setCountries] = useState<IndexedCountry[]>([]);

  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  const country = countries.find((c) => c.iso3 === iso3);

  return (
    <AnimatePresence>
      {country && (
        <motion.aside
          key={country.iso3}
          aria-live="polite"
          aria-label={`${country.name} details`}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed top-20 right-[22px] z-30 flex max-h-[calc(100%-104px)] w-[400px] flex-col rounded-[20px] bg-white/95 shadow-[var(--shadow-card)] backdrop-blur-xl max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[62%] max-md:w-auto max-md:rounded-b-none"
        >
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => select(null)}
            className="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-[10px] border border-border bg-white"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
          <div className="overflow-auto p-[22px]">
            <div className="mb-2.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Relations</div>
            <h2 className="mr-11 text-[26px] leading-tight font-bold tracking-tight text-balance">{country.name}</h2>
            <p className="mt-1 text-sm text-ink-2">Capital · leader · government type</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="mb-3 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Friends and rivals</h3>
              <div className="grid gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-3">Relations, numbers and news for {country.name} connect in the next steps.</p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
