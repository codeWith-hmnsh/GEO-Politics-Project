"use client";

import { ChartNoAxesColumn, Landmark, Layers, Swords, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useGlobe, type LayerId } from "@/lib/store";

const LAYERS: { id: LayerId; title: string; hint: string; Icon: typeof Swords; color: string; tint: string }[] = [
  { id: "wars", title: "Wars & Conflicts", hint: "Active conflicts worldwide", Icon: Swords, color: "#e5484d", tint: "rgba(229,72,77,.12)" },
  { id: "orgs", title: "Summits & Organizations", hint: "Ongoing & upcoming summits", Icon: Landmark, color: "#3f63d8", tint: "rgba(63,99,216,.12)" },
  { id: "econ", title: "Global Economy", hint: "Market moves, trade flows", Icon: ChartNoAxesColumn, color: "#e9a21c", tint: "rgba(242,179,61,.18)" },
  { id: "rel", title: "Relations", hint: "Diplomatic ties & rivalries", Icon: Users, color: "#2fa36b", tint: "rgba(47,163,107,.13)" },
];

/** Left card on Home: the four layers with on/off switches (UI-DESIGN §6). */
export function PulseCard() {
  const layers = useGlobe((s) => s.layers);
  const toggle = useGlobe((s) => s.toggleLayer);
  const open = useGlobe((s) => s.pulseOpen);
  const setOpen = useGlobe((s) => s.setPulseOpen);
  const countrySelected = useGlobe((s) => s.selectedIso3 !== null);
  // Phones start with the card closed so the globe is visible; desktop follows the store flag.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMobileOpen(true);
        }}
        className={`fixed left-3 top-[66px] z-20 flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-semibold shadow-[var(--shadow-card)] md:hidden ${open && mobileOpen ? "hidden" : ""}`}
      >
        <Layers className="size-4" aria-hidden /> Layers
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside
            aria-label="Layers"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className={`fixed left-[22px] top-20 z-20 w-[316px] rounded-[18px] bg-[var(--glass)] p-5 shadow-[var(--shadow-card)] backdrop-blur-xl max-md:inset-x-3 max-md:top-16 max-md:w-auto ${mobileOpen ? "" : "max-md:hidden"}`}
          >
            <div className="flex items-center justify-between gap-2.5">
              <h2 className="text-[22px] leading-tight font-bold tracking-tight">Global Pulse</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ally/10 px-2.5 py-1 text-xs font-semibold text-ally">
                <i className="size-1.5 animate-pulse rounded-full bg-ally" aria-hidden />
                Live
              </span>
            </div>
            <p className="mt-1.5 mb-2.5 text-[12.5px] text-ink-2">What is happening in the world right now.</p>
            {LAYERS.map(({ id, title, hint, Icon, color, tint }) => (
              <label key={id} className="grid cursor-pointer grid-cols-[44px_1fr_auto] items-center gap-x-3 py-2.5">
                <span className="row-span-2 grid size-11 place-items-center rounded-full" style={{ background: tint, color }}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <b className="text-sm font-semibold">{title}</b>
                <Switch
                  checked={layers[id]}
                  onCheckedChange={() => toggle(id)}
                  aria-label={title}
                  className="row-span-2 data-[size=default]:h-[22px] data-[size=default]:w-[38px] data-checked:bg-[var(--c)]"
                  style={{ "--c": color } as React.CSSProperties}
                />
                <small className="col-start-2 text-xs text-ink-3">{hint}</small>
              </label>
            ))}
            {countrySelected ? (
              <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-xs text-ink-2">
                {(
                  [
                    ["Ally / partner", "var(--ally)"],
                    ["Hostile", "var(--conflict)"],
                    ["Mixed", "var(--mixed)"],
                    ["Neutral", "var(--neutral)"],
                  ] as const
                ).map(([label, color]) => (
                  <span key={label} className="flex items-center gap-2">
                    <i className="size-3 rounded-[3px]" style={{ background: color }} aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2.5 text-xs leading-relaxed text-ink-3">
                Tap a country to see its friends and rivals. Scroll to zoom toward any place.
              </p>
            )}
            <button type="button" onClick={() => setMobileOpen(false)} className="mt-3 text-xs font-semibold text-ink-2 underline md:hidden">
              Hide layers
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
