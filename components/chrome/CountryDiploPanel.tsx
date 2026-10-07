"use client";

import { Term, termById } from "@/components/learn/Term";
import { timeAgo, useNews, usePulse, useUnVotes } from "@/lib/api";
import { ISSUERS, alignment, sanctionsFor } from "@/lib/diplomacy";
import type { IndexedCountry } from "@/lib/geo/countries";
import { REL_COLORS, REL_LABEL, relationsFor, type RelStatus } from "@/lib/relations";
import { CountryFacts } from "./CountryFacts";
import { Flag } from "./Flag";

const kicker = "mb-1.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";
const sectTitle = "mb-2.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";

/** Diplomacy country panel: blocs, friends and rivals, UN voting alignment, sanctions and news (PRD §9.7). */
export function CountryDiploPanel({ country, countryName }: { country: IndexedCountry; countryName: (iso3: string) => string }) {
  const { data: pulse } = usePulse();
  const votes = useUnVotes(country.iso3);
  const news = useNews({ section: "diplomacy", country: country.iso3, limit: 3 });
  const orgs = pulse?.data.organizations ?? [];
  const blocs = orgs.filter((o) => o.members.includes(country.iso3));
  const rel = pulse ? [...relationsFor(country.iso3, pulse.data.relations, pulse.data.organizations).values()] : [];
  const top = (s: RelStatus) => rel.filter((r) => r.status === s).slice(0, 3);
  const align = votes.data?.data ? alignment(votes.data.data.agree, country.iso3) : null;
  const sanc = sanctionsFor(country.iso3, blocs.some((b) => b.id === "EU"));
  const issuer = (id: string) => (ISSUERS[id]?.at ? ISSUERS[id].name : countryName(id));

  return (
    <>
      <div className={kicker}>Diplomacy</div>
      <h2 className="mr-11 flex items-center gap-2.5 text-[26px] leading-tight font-bold tracking-tight">
        <Flag iso3={country.iso3} className="h-[19px] w-7" />
        {country.name}
      </h2>
      <CountryFacts iso3={country.iso3} />

      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Blocs</h3>
        {blocs.length ? (
          <div className="flex flex-wrap gap-1.5">
            {blocs.map((b) => (
              <span key={b.id} className="flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold">
                <i className="size-2 rounded-full" style={{ background: b.color }} aria-hidden />
                {termById(b.id.toLowerCase()) ? <Term id={b.id.toLowerCase()}>{b.id}</Term> : b.id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-2">Not a member of the blocs shown on this map.</p>
        )}
      </section>

      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Friends and rivals</h3>
        {(["ally", "hostile", "mixed"] as const).map((s) =>
          top(s).length ? (
            <div key={s} className="mb-2 text-sm">
              <span className="mr-1.5 inline-flex items-center gap-1.5 font-semibold" style={{ color: REL_COLORS[s] }}>
                <i className="size-2.5 rounded-full" style={{ background: REL_COLORS[s] }} aria-hidden />
                {REL_LABEL[s]}:
              </span>
              {top(s)
                .map((r) => countryName(r.iso3))
                .join(", ")}
            </div>
          ) : null,
        )}
        {!rel.length && <p className="text-sm text-ink-2">No reviewed relations yet; others show as neutral.</p>}
      </section>

      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>UN votes{votes.data?.data && ` · ${votes.data.data.year}`}</h3>
        {align ? (
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            {(
              [
                ["Votes most like it", align.most],
                ["Votes least like it", align.least],
              ] as const
            ).map(([title, rows]) => (
              <div key={title} className="min-w-0">
                <div className="mb-1 text-xs font-semibold text-ink-2">{title}</div>
                <ol className="grid gap-1">
                  {rows.map(([iso3, pct]) => (
                    <li key={iso3} className="flex items-center gap-1.5">
                      <Flag iso3={iso3} className="h-[10px] w-[15px] shrink-0" />
                      <span className="min-w-0 truncate">{countryName(iso3)}</span>
                      <b className="ml-auto shrink-0 tabular-nums">{pct}%</b>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-2">{votes.isPending ? "Loading…" : "No UN General Assembly voting record for this country."}</p>
        )}
        <p className="mt-2 text-xs text-ink-3">Share of General Assembly votes in which both countries voted the same way.</p>
      </section>

      {(sanc.received.length > 0 || sanc.imposed.length > 0) && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className={sectTitle}>Sanctions</h3>
          {sanc.received.map((r) => (
            <p key={r.target} className="mb-2 text-sm leading-relaxed">
              <b>Under sanctions</b> from {r.by.map(issuer).join(", ")} (since {r.since}). {r.what}
            </p>
          ))}
          {sanc.imposed.length > 0 && (
            <p className="text-sm leading-relaxed">
              <b>Imposes sanctions</b> on {sanc.imposed.map((r) => countryName(r.target)).join(", ")}
              {sanc.imposed.some((r) => r.via) && " (through the EU for some)"}.
            </p>
          )}
          <p className="mt-1.5 text-xs text-ink-3">Major programmes only. Draft list under editorial review.</p>
        </section>
      )}

      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Latest diplomacy news about {country.name}</h3>
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
          <p className="text-sm text-ink-2">No diplomacy headlines about {country.name} from trusted outlets in the last 48 hours.</p>
        )}
      </section>
    </>
  );
}
