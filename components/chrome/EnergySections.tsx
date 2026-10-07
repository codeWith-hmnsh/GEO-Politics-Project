"use client";

import minerals from "@/data/curated/minerals.json";
import type { CountryFacts } from "@/lib/data/country";
import { MIX_KEYS, type MixKey } from "@/lib/energy";
import { Flag } from "./Flag";

const sectTitle = "mb-2.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";

export const MIX_COLORS: Record<MixKey, string> = {
  coal: "#4a4a4a",
  oil: "#8a5a2b",
  gas: "#d08b3a",
  nuclear: "#8e6bd1",
  hydro: "#2f7fc1",
  solar: "#f2c230",
  wind: "#5fb7a8",
  other: "#7fbf5a",
};
const MIX_LABEL: Record<MixKey, string> = {
  coal: "Coal",
  oil: "Oil",
  gas: "Gas",
  nuclear: "Nuclear",
  hydro: "Hydro",
  solar: "Solar",
  wind: "Wind",
  other: "Other renewables",
};
export const CRUDE_COLOR = "#8a5a2b";

const usd = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`);

/** Energy panel extras: mix bar, crude suppliers and critical minerals (PRD §9.6). */
export function EnergySections({ iso3, name, facts, countryName }: { iso3: string; name: string; facts?: CountryFacts; countryName: (iso3: string) => string }) {
  const mix = facts?.mix;
  const crude = facts?.crude;
  const mined = Object.values(minerals.minerals)
    .map((m) => ({ label: m.label, use: m.use, share: (m.shares as Record<string, number>)[iso3] }))
    .filter((m) => m.share);
  const parts = mix ? MIX_KEYS.filter((k) => mix[k] > 0) : [];
  const total = mix ? parts.reduce((a, k) => a + mix[k], 0) : 0;

  return (
    <>
      {mix && total > 0 && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>
            {mix.basis === "energy" ? "Energy mix" : "Electricity mix"} · {mix.year}
          </h3>
          <div className="flex h-4 overflow-hidden rounded-full" role="img" aria-label={parts.map((k) => `${MIX_LABEL[k]} ${mix[k]}%`).join(", ")}>
            {parts.map((k) => (
              <span key={k} style={{ width: `${(mix[k] / total) * 100}%`, background: MIX_COLORS[k] }} />
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-2">
            {parts.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-sm" style={{ background: MIX_COLORS[k] }} aria-hidden />
                {MIX_LABEL[k]} <b className="ml-auto font-semibold text-ink tabular-nums">{mix[k].toFixed(1)}%</b>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-ink-3">
            {mix.basis === "energy"
              ? "Share of all energy used, including transport and heating."
              : "Only electricity is reported for this country, so transport and heating fuels are not included."}{" "}
            Source: Our World in Data.
          </p>
        </section>
      )}

      {crude && crude.suppliers.length > 0 && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>Where its crude oil comes from · {crude.year}</h3>
          <ul className="grid gap-1">
            {crude.suppliers.map((p) => (
              <li key={p.iso3} className="grid grid-cols-[18px_1fr_64px] items-center gap-2 text-[13px]">
                <Flag iso3={p.iso3} className="h-[11px] w-4" />
                <span className="relative h-5 overflow-hidden rounded bg-paper">
                  <span
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ width: `${(p.value / crude.suppliers[0].value) * 100}%`, background: `${CRUDE_COLOR}44` }}
                  />
                  <span className="relative px-1.5 leading-5">{countryName(p.iso3)}</span>
                </span>
                <span className="text-right tabular-nums">{usd(p.value)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-ink-3">
            Crude oil imports {crude.total > 0 && `worth ${usd(crude.total)} in total`}, as reported by {name}. Source: UN Comtrade (HS 2709).
          </p>
        </section>
      )}

      {mined.length > 0 && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>Critical minerals · {minerals.year}</h3>
          <ul className="grid gap-2">
            {mined.map((m) => (
              <li key={m.label} className="text-sm">
                <div className="flex items-baseline justify-between">
                  <b className="font-semibold">{m.label}</b>
                  <span className="font-bold tabular-nums">{m.share}% of world</span>
                </div>
                <div className="text-xs text-ink-3">{m.use}</div>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-ink-3">Share of world mine production. Source: USGS Mineral Commodity Summaries 2025.</p>
        </section>
      )}
    </>
  );
}
