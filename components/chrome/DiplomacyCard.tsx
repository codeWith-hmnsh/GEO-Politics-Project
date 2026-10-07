"use client";

import { motion } from "motion/react";
import { Term, termById } from "@/components/learn/Term";
import sanctions from "@/data/curated/sanctions.json";
import { timeAgo, useNews, usePulse } from "@/lib/api";
import { DIPLO_VIEWS, ISSUERS } from "@/lib/diplomacy";
import { MODE_COPY, MODE_SCALES } from "@/lib/metrics";
import { REL_COLORS, REL_LABEL } from "@/lib/relations";
import { useGlobe } from "@/lib/store";
import { Flag } from "./Flag";

const sectTitle = "mb-2 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";

/** Left card in Diplomacy: chips for blocs, UN votes, sanctions, activity and relations (PRD §9.7). */
export function DiplomacyCard({ countryName }: { countryName: (iso3: string) => string }) {
  const mode = useGlobe((s) => s.mode);
  const { view, bloc } = useGlobe((s) => s.diplo);
  const setDiplo = useGlobe((s) => s.setDiplo);
  const selected = useGlobe((s) => s.selectedIso3);
  const { data: pulse } = usePulse();
  const news = useNews({ section: "diplomacy", limit: 10 });
  if (mode !== "diplomacy") return null;
  const orgs = pulse?.data.organizations ?? [];
  const activeBloc = orgs.find((o) => o.id === bloc);

  return (
    <motion.aside
      aria-label="Diplomacy mode"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed top-20 left-[22px] z-20 max-h-[calc(100%-190px)] w-[316px] overflow-auto rounded-[18px] bg-[var(--glass)] p-5 shadow-[var(--shadow-card)] backdrop-blur-xl max-md:inset-x-3 max-md:top-16 max-md:max-h-[40%] max-md:w-auto"
    >
      <h2 className="text-[22px] leading-tight font-bold tracking-tight">{MODE_COPY.diplomacy.title}</h2>
      <p className="mt-1.5 mb-3 text-[12.5px] text-ink-2">{MODE_COPY.diplomacy.question}</p>
      <div role="group" aria-label="View" className="flex flex-wrap gap-1.5">
        {DIPLO_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setDiplo({ view: v.id })}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink-2 aria-pressed:border-transparent aria-pressed:bg-[var(--ink-strong)] aria-pressed:text-white"
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-4 text-[13px] leading-relaxed text-ink-2">
        {view === "blocs" && (
          <>
            <div role="group" aria-label="Bloc" className="flex flex-wrap gap-1.5">
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={bloc === o.id}
                  onClick={() => setDiplo({ bloc: o.id })}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-semibold aria-pressed:border-ink"
                >
                  <i className="size-2.5 rounded-full" style={{ background: o.color }} aria-hidden />
                  {o.id}
                </button>
              ))}
            </div>
            {activeBloc && (
              <p className="mt-3">
                <b className="text-ink">
                  {termById(activeBloc.id.toLowerCase()) ? <Term id={activeBloc.id.toLowerCase()}>{activeBloc.name}</Term> : activeBloc.name}
                </b>{" "}
                · {activeBloc.members.length} members. {activeBloc.purpose}
              </p>
            )}
          </>
        )}
        {view === "unvotes" && (
          <>
            <p>
              {selected
                ? `Countries coloured by how often they voted the same way as ${countryName(selected)} in the UN General Assembly.`
                : "Tap a country to colour the world by how often others voted the same way in the UN General Assembly."}
            </p>
            <div className="mt-2.5 h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${MODE_SCALES.diplomacy.join(",")})` }} />
            <div className="mt-1 flex justify-between text-xs text-ink-3">
              <span>Votes differently</span>
              <span>Votes alike</span>
            </div>
            <p className="mt-2 text-xs text-ink-3">Source: UNGA voting data, Bailey, Strezhnev and Voeten (Harvard Dataverse).</p>
          </>
        )}
        {view === "sanctions" && (
          <>
            <p>Arcs run from who imposes sanctions to who is targeted. Tap a country to see only its sanctions.</p>
            <ul className="mt-2.5 grid gap-1.5">
              {sanctions.items.map((r) => (
                <li key={r.target} className="flex items-start gap-2 text-xs">
                  <Flag iso3={r.target} className="mt-0.5 h-[11px] w-4 shrink-0" />
                  <span>
                    <b className="text-ink">{countryName(r.target)}</b> · by {r.by.map((b) => (ISSUERS[b]?.at ? b : countryName(b))).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-3">Major programmes only (UN, EU, UK, US and allies). Draft list under editorial review.</p>
          </>
        )}
        {view === "relations" && (
          <>
            <p>Tap a country to see its friends and rivals, as on Home.</p>
            <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-xs">
              {(["ally", "hostile", "mixed", "neutral"] as const).map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <i className="size-3 rounded-[3px]" style={{ background: REL_COLORS[k] }} aria-hidden />
                  {REL_LABEL[k]}
                </span>
              ))}
            </div>
          </>
        )}
        {view === "activity" && <p>Pulsing beacons mark visits, talks and summits that trusted outlets reported in the last 48 hours.</p>}
      </div>

      <section className="mt-4 border-t border-border pt-3">
        <h3 className={sectTitle}>{view === "activity" ? "Timeline" : "Latest diplomacy news"}</h3>
        {news.data?.data.length ? (
          <ol className="grid gap-2">
            {news.data.data.slice(0, view === "activity" ? 10 : 3).map((n) => (
              <li key={n.id} className="text-[13px] leading-snug">
                <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {n.title}
                </a>
                <span className="block text-[11.5px] text-ink-3">
                  {n.source} · {timeAgo(n.publishedAt)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-ink-3">No recent diplomacy headlines from trusted outlets.</p>
        )}
      </section>
    </motion.aside>
  );
}
