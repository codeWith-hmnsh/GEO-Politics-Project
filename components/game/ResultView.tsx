"use client";

import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { whyChain } from "@/lib/game/engine/causes";
import { PROJECT_BY_ID } from "@/lib/game/engine/projects";
import { ranks, trend } from "@/lib/game/engine/score";
import type { Cause, Dimension, Iso3 } from "@/lib/game/engine/types";
import { SEATS } from "@/lib/game/engine/types";
import { useGame } from "@/lib/game/store";
import { SHORT, causeText, causeValue, money, signed } from "@/lib/game/text";
import { cn } from "@/lib/utils";
import { Btn, Delta, TrendChip, eyebrow } from "./bits";

type Row = { key: string; label: string; field: string; v: number; d: number; fmt: (v: number) => string; digits: number; invert?: boolean; dim?: Dimension };

export function ResultView() {
  const world = useGame((s) => s.world)!;
  const prev = useGame((s) => s.prev)!;
  const me = useGame((s) => s.setup.me);
  const record = useGame((s) => s.record)!;
  const impact = useGame((s) => s.impact);
  const next = useGame((s) => s.next);
  const a = prev.countries[me];
  const b = world.countries[me];
  const r0 = ranks(prev)[me];
  const r1 = ranks(world)[me];
  const pct = (v: number) => `${v.toFixed(1)}%`;
  const rows: Row[] = [
    { key: "growth", label: "Growth", field: "growth", v: b.growth, d: b.growth - a.growth, fmt: pct, digits: 1, dim: "economy" },
    { key: "unemployment", label: "Unemployment", field: "unemployment", v: b.unemployment, d: b.unemployment - a.unemployment, fmt: pct, digits: 1, invert: true, dim: "development" },
    { key: "inflation", label: "Inflation", field: "inflation", v: b.inflation, d: b.inflation - a.inflation, fmt: pct, digits: 1, invert: true, dim: "stability" },
    { key: "energy", label: "Energy supply", field: "energy.supply", v: b.goods.energy.supplyRatio * 100, d: (b.goods.energy.supplyRatio - a.goods.energy.supplyRatio) * 100, fmt: (v) => `${Math.min(999, v).toFixed(0)}%`, digits: 0, dim: "security" },
    { key: "food", label: "Food supply", field: "food.supply", v: b.goods.food.supplyRatio * 100, d: (b.goods.food.supplyRatio - a.goods.food.supplyRatio) * 100, fmt: (v) => `${Math.min(999, v).toFixed(0)}%`, digits: 0, dim: "security" },
    { key: "stability", label: "Stability", field: "stability", v: b.stability, d: b.stability - a.stability, fmt: (v) => v.toFixed(0), digits: 0, dim: "stability" },
    { key: "treasury", label: "Treasury", field: "treasury", v: b.treasury, d: b.treasury - a.treasury, fmt: money, digits: 0 },
    { key: "influence", label: "Influence", field: "influence", v: b.influence, d: b.influence - a.influence, fmt: (v) => v.toFixed(0), digits: 0, dim: "diplomacy" },
  ];
  const dropped = record.dropped.filter((d) => d.iso3 === me);
  const impacts = impact
    ? ([
        ["Power index", impact.power, 1, false],
        ["Growth", impact.growth, 2, false],
        ["Energy supply", impact.energy, 0, false],
        ["Unemployment", impact.unemployment, 2, true],
        ["Stability", impact.stability, 1, false],
        ["Food supply", impact.food, 0, false],
      ] as const).filter(([, v, d]) => Math.abs(v) >= Math.pow(10, -d) / 2 + (d === 0 ? 0.5 : 0))
    : [];
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-[18px] pt-5 pb-5">
        <div className={eyebrow}>{record.year} · Your year</div>
        <h2 className="mt-1.5 flex items-baseline gap-2 font-display text-[26px] font-semibold">
          {r1 < r0 ? `You climbed to #${r1}` : r1 > r0 ? `You slipped to #${r1}` : `You hold #${r1}`}
          {r1 !== r0 && <Delta v={r0 - r1} d={0} className="text-[15px]" />}
        </h2>

        <section className="mt-4 rounded-2xl bg-gradient-to-br from-[#1A2C35] to-[var(--ink-strong)] p-4 text-[var(--paper)]">
          <div className="text-[11px] font-extrabold tracking-[.14em] text-white/60 uppercase">What your decisions did</div>
          <p className="mt-1 text-[12.5px] text-white/70">Compared with the same year if you had done nothing.</p>
          {impacts.length ? (
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {impacts.map(([label, v, d, inv]) => (
                <div key={label} className="rounded-xl bg-white/8 px-3 py-2">
                  <div className="text-[11.5px] font-bold text-white/60">{label}</div>
                  <div className={cn("text-[18px] font-extrabold tabular-nums", (inv ? v < 0 : v > 0) ? "text-[#7fe0a8]" : "text-[#ff8f92]")}>{signed(v, d)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13.5px] font-semibold">No visible change this year. Projects and deals often pay off later.</p>
          )}
          {world.countries[me].projects.length > 0 && (
            <p className="mt-2.5 text-[12.5px] text-white/75">
              Building: {world.countries[me].projects.map((p) => `${PROJECT_BY_ID.get(p.id)?.name} (ready ${world.year - 1 + p.turnsLeft})`).join(", ")}
            </p>
          )}
        </section>

        <div className="mt-4">
          {rows.map((r, i) => (
            <ResultRow key={r.key} row={r} index={i} causes={record.causes} me={me} trendDim={r.dim ? trend(world, me, r.dim) : null} />
          ))}
        </div>

        {dropped.length > 0 && (
          <div className="mt-3 rounded-xl border border-[rgba(232,162,28,.35)] bg-[rgba(232,162,28,.1)] p-3 text-[13px]">
            <b>Orders that could not run</b>
            {dropped.map((d, i) => (
              <div key={i} className="text-ink-2">
                {d.reason}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border bg-white/70 px-3.5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
        <Btn className="min-h-[50px] w-full text-[15.5px]" onClick={next} data-coach="continue">
          {world.ended ? "See how the match ended" : `Continue to ${world.year}`} <ChevronRight className="size-4" />
        </Btn>
      </div>
    </div>
  );
}

function ResultRow({ row, index, causes, me, trendDim }: { row: Row; index: number; causes: Cause[]; me: Iso3; trendDim: ReturnType<typeof trend> | null }) {
  const [open, setOpen] = useState(false);
  const tutorial = useGame((s) => s.tutorial);
  const setTutorial = useGame((s) => s.setTutorial);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.3 }} className="border-b border-border py-2.5" data-coach={index === 0 ? "why" : undefined}>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[14px] font-bold">
          {row.label}
          {trendDim && trendDim !== "unchanging" && <TrendChip t={trendDim} />}
        </div>
        <div className="min-w-[64px] text-right text-[15px] font-extrabold tabular-nums">
          {row.fmt(row.v)}
        </div>
        <div className="flex items-center gap-1.5">
          <Delta v={row.d} d={row.digits} invert={row.invert} />
          <button
            className="rounded-lg px-2 py-1 text-[12px] font-extrabold text-[#1F5159] hover:bg-[rgba(43,106,115,.1)]"
            onClick={() => {
              setOpen((o) => !o);
              if (tutorial !== null && tutorial >= 3) setTutorial(null);
            }}
            aria-expanded={open}
          >
            {open ? "Close" : "Why?"}
          </button>
        </div>
      </div>
      <AnimatePresence>{open && <WhyChain field={`${me}.${row.field}`} causes={causes} me={me} />}</AnimatePresence>
    </motion.div>
  );
}

function WhyChain({ field, causes, me }: { field: string; causes: Cause[]; me: Iso3 }) {
  const top = causes.filter((c) => c.field === field && Math.abs(c.delta) >= 0.05).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const main = top.slice(0, 3);
  const rest = top.slice(3, 7);
  let n = 0;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="grid gap-0 pt-2.5 pl-2">
        {main.length === 0 && <div className="rounded-xl border border-border bg-white px-3 py-2 text-[13px] font-semibold text-ink-2">Nothing big changed this. It moved with the economy.</div>}
        {main.map((c, k) => {
          const chain = whyChain(causes, c.id);
          const nodes = chain.length > 1 ? chain : [c];
          return (
            <div key={c.id} className={cn(k > 0 && "mt-2.5")}>
              {nodes.map((node, j) => {
                const delay = n++ * 0.12;
                const actor = node.actor && node.actor !== me && SEATS.includes(node.actor as Iso3) ? `${SHORT[node.actor as Iso3]}'s move` : node.actor === "event" ? "world event" : node.actor === "market" ? "world market" : null;
                return (
                  <div key={node.id}>
                    {j > 0 && <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay }} className="ml-5 block h-3.5 w-0.5 origin-top bg-ink-3" />}
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={cn("flex justify-between gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-bold", j === 0 && nodes.length > 1 ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[rgba(17,35,43,.16)] bg-white")}>
                      <span>
                        {causeText(node)}
                        {actor && <small className={cn("font-semibold", j === 0 && nodes.length > 1 ? "text-white/70" : "text-ink-3")}> · {actor}</small>}
                      </span>
                      <small className="font-semibold whitespace-nowrap tabular-nums opacity-80">{causeValue(node)}</small>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {rest.length > 0 && <p className="mt-2 text-[12.5px] text-ink-2">Also: {rest.map((c) => causeText(c)).join(" · ")}</p>}
      </div>
    </motion.div>
  );
}
