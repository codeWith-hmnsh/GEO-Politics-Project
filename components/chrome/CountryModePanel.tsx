"use client";

import { Info } from "lucide-react";
import capability from "@/data/curated/capability.json";
import nuclear from "@/data/curated/nuclear.json";
import { timeAgo, useIndicators, useNews } from "@/lib/api";
import { CAPABILITY_FORMULA, capabilityScores } from "@/lib/capability";
import type { IndexedCountry } from "@/lib/geo/countries";
import { MODE_COPY, metricsFor } from "@/lib/metrics";
import { useGlobe } from "@/lib/store";
import { Flag } from "./Flag";
import { Sparkline } from "./Sparkline";

const kicker = "mb-1.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";
const sectTitle = "mb-2.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";

/** Country panel in Economy / Defense: core numbers, trend, meaning, source and the country's news (PRD §9.4–9.5). */
export function CountryModePanel({ country }: { country: IndexedCountry }) {
  const mode = useGlobe((s) => s.mode) as "economy" | "defense";
  const { data, isPending } = useIndicators(mode);
  const news = useNews({ section: mode, country: country.iso3, limit: 3 });
  const year = new Date().getUTCFullYear();
  const rows = metricsFor(mode)
    .filter((m) => m.id !== "capability" && m.id !== "nuclear")
    .map((m) => ({ def: m, data: data?.data[m.id] }))
    .map(({ def, data }) => ({ def, value: data?.values[country.iso3], series: data?.series[country.iso3] ?? [] }));

  const nuke = mode === "defense" ? nuclear.items.find((n) => n.iso3 === country.iso3) : undefined;
  const inv = mode === "defense" ? capability.items.find((c) => c.iso3 === country.iso3) : undefined;
  const score =
    inv && data
      ? capabilityScores(
          capability.items.map((r) => ({
            ...r,
            budget: data.data.milUsd?.values[r.iso3]?.value,
            personnel: data.data.personnel?.values[r.iso3]?.value,
          })),
        ).get(country.iso3)
      : undefined;

  return (
    <>
      <div className={kicker}>{MODE_COPY[mode].title}</div>
      <h2 className="mr-11 flex items-center gap-2.5 text-[26px] leading-tight font-bold tracking-tight">
        <Flag iso3={country.iso3} className="h-[19px] w-7" />
        {country.name}
      </h2>

      <ul className="mt-4 grid gap-2.5">
        {rows.map(({ def, value, series }) => (
          <li key={def.id} className="rounded-2xl bg-paper p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-ink-2">{def.title}</div>
                <div className="mt-1 text-[22px] leading-none font-bold tabular-nums">
                  {isPending ? "…" : value ? def.format(value.value) : "No data"}
                </div>
                {value && (
                  <div className="mt-1 text-[11.5px] text-ink-3">
                    {value.year}
                    {value.year >= year && " estimate"}
                  </div>
                )}
              </div>
              <Sparkline
                points={series}
                lastActual={def.source.startsWith("IMF") ? year - 1 : undefined}
                color={mode === "economy" ? "#c8891a" : "#3f63d8"}
                label={`${def.title} trend for ${country.name}`}
              />
            </div>
            {value && <p className="mt-2 text-xs leading-relaxed text-ink-2">{def.meaning(value.value)}</p>}
          </li>
        ))}
      </ul>

      {mode === "defense" && (
        <section className="mt-5 border-t border-border pt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Capability Index</h3>
            <span className="rounded-full bg-[#fff1c7] px-2 py-0.5 text-[11px] font-bold text-[#7a5200]">Estimate</span>
          </div>
          {score ? (
            <div className="grid gap-2">
              {(["air", "land", "sea"] as const).map((d) => (
                <div key={d} className="grid grid-cols-[44px_1fr_52px] items-center gap-2.5 text-sm">
                  <span className="font-semibold capitalize">{d}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-paper">
                    <span className="block h-full rounded-full bg-[#3f63d8]" style={{ width: `${score[d] * 10}%` }} />
                  </span>
                  <span className="text-right font-bold tabular-nums">{score[d].toFixed(1)}/10</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-2">Not enough published inventory data for {country.name} yet.</p>
          )}
          <details className="mt-3 text-xs leading-relaxed text-ink-2">
            <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-ink">
              <Info className="size-3.5" aria-hidden />
              How we calculate
            </summary>
            <p className="mt-2">
              Each input is compared with the largest value on a log scale (0 = none, 1 = largest). Scores are weighted sums × 10:
            </p>
            <ul className="mt-1.5 grid gap-1">
              {(Object.entries(CAPABILITY_FORMULA) as [string, readonly (readonly [string, number])[]][]).map(([d, parts]) => (
                <li key={d}>
                  <b className="capitalize">{d}</b>: {parts.map(([n, w]) => `${Math.round(w * 100)}% ${n.toLowerCase()}`).join(" + ")}
                </li>
              ))}
            </ul>
            <p className="mt-1.5">
              Inputs: {capability.source} Budget and personnel from SIPRI and World Bank. This is an estimate of military means, not a
              ranking of who would win a war.
            </p>
          </details>
        </section>
      )}

      {nuke && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>☢ Nuclear status</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-2">Warheads</dt>
            <dd className="font-semibold">~{nuke.warheads.toLocaleString()} (estimate)</dd>
            <dt className="text-ink-2">Delivery</dt>
            <dd className="font-semibold">{nuke.delivery.join(", ")}</dd>
            <dt className="text-ink-2">NPT</dt>
            <dd className="font-semibold">{nuke.npt}</dd>
          </dl>
          <p className="mt-1.5 text-xs text-ink-3">{nuclear.source}</p>
        </section>
      )}

      <p className="mt-4 text-xs text-ink-3">
        Sources: {[...new Set(rows.map((r) => r.def.source))].join("; ")}. Updated {timeAgo(data?.asOf)}.
      </p>

      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>
          Latest {mode} news about {country.name}
        </h3>
        {news.data?.data.length ? (
          <ul className="grid gap-2.5">
            {news.data.data.map((n) => (
              <li key={n.id} className="text-[13.5px] leading-snug">
                <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {n.title}
                </a>
                <span className="block text-xs text-ink-3">
                  {n.source} · {timeAgo(n.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">No {mode} headlines about {country.name} from trusted outlets in the last 48 hours.</p>
        )}
      </section>
    </>
  );
}
