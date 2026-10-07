"use client";

import { Info } from "lucide-react";
import capability from "@/data/curated/capability.json";
import nuclear from "@/data/curated/nuclear.json";
import { TRADE_COLORS } from "@/components/globe/layers/TradeLayer";
import { timeAgo, useCountryFacts, useIndicators, useNews } from "@/lib/api";
import { CAPABILITY_FORMULA, CAPABILITY_WHAT, capabilityScores } from "@/lib/capability";
import type { IndexedCountry } from "@/lib/geo/countries";
import { MODE_COPY, metricsFor } from "@/lib/metrics";
import { useGlobe } from "@/lib/store";
import { CompareButton } from "./ComparePanel";
import { CountryFacts } from "./CountryFacts";
import { Term } from "@/components/learn/Term";
import { Flag } from "./Flag";
import { Sparkline } from "./Sparkline";

const kicker = "mb-1.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";
const sectTitle = "mb-2.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";
const usd = (v: number) => (v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`);

/** Country panel in Economy / Defense: core numbers, trend, meaning, source and the country's news (PRD §9.4–9.5). */
export function CountryModePanel({ country, countryName }: { country: IndexedCountry; countryName: (iso3: string) => string }) {
  const mode = useGlobe((s) => s.mode) as "economy" | "defense";
  const { data, isPending } = useIndicators(mode);
  const news = useNews({ section: mode, country: country.iso3, limit: 3 });
  const facts = useCountryFacts(country.iso3);
  const trade = mode === "economy" ? facts.data?.data.trade : null;
  const creditors = mode === "economy" ? facts.data?.data.creditors : null;
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
      <CountryFacts iso3={country.iso3} />
      <CompareButton />

      <ul className="mt-4 grid gap-2.5">
        {rows.map(({ def, value, series }) => (
          <li key={def.id} className="rounded-2xl bg-paper p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-ink-2">{def.term ? <Term id={def.term}>{def.title}</Term> : def.title}</div>
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

      {trade && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>Top trade partners · {trade.year}</h3>
          {(["exports", "imports"] as const).map((side) => {
            const list = trade[side];
            const total = side === "exports" ? trade.exportsTotal : trade.importsTotal;
            const max = Math.max(...list.map((p) => p.value), 1);
            return (
              <div key={side} className="mb-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold capitalize">
                    <i className="size-2.5 rounded-full" style={{ background: TRADE_COLORS[side] }} aria-hidden />
                    {side} {side === "exports" ? "to" : "from"}
                  </span>
                  {total > 0 && <span className="text-ink-3">Total {usd(total)}</span>}
                </div>
                <ul className="grid gap-1">
                  {list.map((p) => (
                    <li key={p.iso3} className="grid grid-cols-[18px_1fr_64px] items-center gap-2 text-[13px]">
                      <Flag iso3={p.iso3} className="h-[11px] w-4" />
                      <span className="relative h-5 overflow-hidden rounded bg-paper">
                        <span
                          className="absolute inset-y-0 left-0 rounded"
                          style={{ width: `${(p.value / max) * 100}%`, background: `${TRADE_COLORS[side]}55` }}
                        />
                        <span className="relative px-1.5 leading-5">{countryName(p.iso3)}</span>
                      </span>
                      <span className="text-right tabular-nums">{usd(p.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="text-xs text-ink-3">Goods only, as reported by {country.name}. Source: UN Comtrade.</p>
        </section>
      )}

      {creditors && creditors.creditors.length > 0 && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>Who it owes · {creditors.year}</h3>
          <p className="mb-2 text-xs text-ink-2">
            Public external debt: {usd(creditors.total)}. Largest lenders:
          </p>
          <ul className="grid gap-1">
            {creditors.creditors.map((c) => {
              const max = creditors.creditors[0].value || 1;
              return (
                <li key={c.name} className="grid grid-cols-[18px_1fr_64px] items-center gap-2 text-[13px]">
                  {c.iso3 ? <Flag iso3={c.iso3} className="h-[11px] w-4" /> : <span aria-hidden className="mx-auto size-2 rounded-full bg-ink-3" />}
                  <span className="relative h-5 overflow-hidden rounded bg-paper">
                    <span
                      className="absolute inset-y-0 left-0 rounded"
                      style={{ width: `${(c.value / max) * 100}%`, background: `${TRADE_COLORS.creditors}44` }}
                    />
                    <span className="relative px-1.5 leading-5">{c.iso3 ? countryName(c.iso3) : c.name}</span>
                  </span>
                  <span className="text-right tabular-nums">{usd(c.value)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-xs text-ink-3">
            Bondholders are private investors. Source: World Bank International Debt Statistics (low- and middle-income countries only).
          </p>
        </section>
      )}

      {mode === "defense" && (
        <section className="mt-5 border-t border-border pt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Capability Index</h3>
            <span className="rounded-full bg-[#fff1c7] px-2 py-0.5 text-[11px] font-bold text-[#7a5200]">Estimate</span>
          </div>
          {score ? (
            <div className="grid gap-2">
              {(["air", "land", "sea"] as const).map((d) => {
                const v = score[d];
                return (
                  <div key={d} className="grid grid-cols-[44px_1fr_52px] items-center gap-2.5 text-sm">
                    <span className="font-semibold capitalize">{d}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-paper">
                      <span className="block h-full rounded-full bg-[#3f63d8]" style={{ width: `${(v ?? 0) * 10}%` }} />
                    </span>
                    <span className="text-right font-bold tabular-nums">{v === null ? "—" : `${v.toFixed(1)}/10`}</span>
                  </div>
                );
              })}
              <p className="text-xs text-ink-3">Estimate — not a ranking of who would win.</p>
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
              <b>What it is:</b> {CAPABILITY_WHAT.is}
            </p>
            <p className="mt-1">
              <b>What it is not:</b> {CAPABILITY_WHAT.isNot}
            </p>
            <p className="mt-2">
              Each input is compared with the world&apos;s largest on a log scale (0 = none, 1 = largest), so giants don&apos;t flatten
              everyone. Scores are weighted sums × 10:
            </p>
            <ul className="mt-1.5 grid gap-1">
              {(Object.entries(CAPABILITY_FORMULA) as [string, readonly (readonly [string, number])[]][]).map(([d, parts]) => (
                <li key={d}>
                  <b className="capitalize">{d}</b>: {parts.map(([n, w]) => `${Math.round(w * 100)}% ${n.toLowerCase()}`).join(" + ")}
                </li>
              ))}
            </ul>
            {inv && (
              <p className="mt-1.5">
                Inputs for {country.name}: {inv.aircraft.toLocaleString("en-US")} combat aircraft, {inv.tanks.toLocaleString("en-US")} tanks,{" "}
                {inv.warships} warships and submarines, {inv.carriers} carriers
                {data?.data.personnel?.values[country.iso3] &&
                  `, ${Math.round(data.data.personnel.values[country.iso3].value).toLocaleString("en-US")} personnel (${data.data.personnel.values[country.iso3].year})`}
                .
              </p>
            )}
            <p className="mt-1.5">Sources: {capability.source} Personnel from the World Bank.</p>
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
            <dt className="text-ink-2">
              <Term id="npt">NPT</Term>
            </dt>
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
