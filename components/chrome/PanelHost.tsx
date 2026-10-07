"use client";

import { ExternalLink, Play, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import CountUp from "@/components/bits/CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { daysSince } from "@/components/globe/ConflictMarkers";
import { Medal } from "@/components/globe/emblems";
import { timeAgo, useNews, usePulse } from "@/lib/api";
import type { Pulse, PulseConflict } from "@/lib/data/pulse";
import type { NewsCluster } from "@/lib/schemas/news";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { Flag } from "./Flag";

const kicker = "mb-2.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";
const sectTitle = "mb-3 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";
const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-conflict/10 text-conflict" },
  escalating: { label: "Escalating", cls: "bg-conflict/15 text-conflict" },
  ceasefire: { label: "Ceasefire", cls: "bg-mixed/15 text-[#8a5e00]" },
  frozen: { label: "Frozen", cls: "bg-ink/10 text-ink-2" },
};
const INTENSITY = ["", "Low", "Medium", "High"];

function ConflictPanel({ c }: { c: PulseConflict }) {
  const status = STATUS[c.status] ?? STATUS.active;
  const days = daysSince(c.start);
  return (
    <>
      <div className={kicker}>Conflict</div>
      <h2 className="mr-11 text-[26px] leading-tight font-bold tracking-tight text-balance">{c.name}</h2>
      <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold tracking-[.08em] uppercase ${status.cls}`}>
        <i className="size-1.5 rounded-full bg-current" aria-hidden />
        {status.label}
      </span>
      <div className="my-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-paper p-3.5">
          <div className="text-[26px] leading-none font-bold tabular-nums">
            <CountUp to={days} separator="," duration={1.2} />
          </div>
          <div className="mt-1.5 text-xs text-ink-2">
            days since {new Date(c.start).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="rounded-2xl bg-paper p-3.5">
          <div className="text-[26px] leading-none font-bold">{INTENSITY[c.intensity]}</div>
          <div className="mt-1.5 text-xs text-ink-2">intensity tier</div>
        </div>
      </div>
      <div className={kicker}>Parties</div>
      <div className="flex flex-wrap gap-1.5">
        {c.parties.map((p, i) => (
          <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1.5 text-xs font-semibold">
            {c.flags[i] && <Flag iso3={c.flags[i]} className="h-[11px] w-4" />}
            {p}
          </span>
        ))}
      </div>
      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Why it matters</h3>
        <ol className="grid gap-3">
          {c.why.map((w, i) => (
            <li key={w} className="grid grid-cols-[24px_1fr] gap-2.5 leading-relaxed">
              <span className="grid size-6 place-items-center rounded-full bg-[var(--ink-strong)] text-xs font-bold text-white">{i + 1}</span>
              {w}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Latest verified news</h3>
        {c.news.length ? (
          <ul className="grid gap-2">
            {c.news.map((n) => (
              <li key={n.id} className="rounded-xl border border-border bg-white px-3 py-2.5">
                <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold leading-snug hover:underline">
                  {n.title}
                  <ExternalLink className="ml-1 inline size-3.5 text-ink-3" aria-hidden />
                </a>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
                  {n.source} · {timeAgo(n.publishedAt)}
                  {n.sourceCount > 1 && <> · {n.sourceCount} sources</>}
                  {n.verified && <ShieldCheck className="size-3.5 text-ally" aria-label="Verified by 2+ trusted outlets" />}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">No new reports from trusted outlets in the last 48 hours.</p>
        )}
      </section>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          title="Story tours arrive in a later release"
          className="inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[var(--ink-strong)] px-3.5 font-semibold text-white opacity-50"
        >
          <Play className="size-4" aria-hidden /> Watch the story
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Red arcs are symbolic: they appear only when two or more trusted outlets report strikes in the last 48 hours. They are not
        real flight paths.
      </p>
    </>
  );
}

function NewsList({ items, empty }: { items: NewsCluster[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-ink-2">{empty}</p>;
  return (
    <ul className="grid gap-2">
      {items.map((n) => (
        <li key={n.id} className="rounded-xl border border-border bg-white px-3 py-2.5">
          <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold leading-snug hover:underline">
            {n.title}
            <ExternalLink className="ml-1 inline size-3.5 text-ink-3" aria-hidden />
          </a>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
            {n.source} · {timeAgo(n.publishedAt)}
            {n.sourceCount > 1 && <> · {n.sourceCount} sources</>}
            {n.verified && <ShieldCheck className="size-3.5 text-ally" aria-label="Verified by 2+ trusted outlets" />}
          </span>
        </li>
      ))}
    </ul>
  );
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (n: NewsCluster, words: string[]) => words.some((w) => new RegExp(`\\b${escapeRe(w)}\\b`, "i").test(n.title));

function BlocPanel({ org, countryName }: { org: Pulse["organizations"][number]; countryName: (iso3: string) => string }) {
  const news = useNews({ limit: 100 });
  const related = (news.data?.data ?? []).filter((n) => mentions(n, [org.id, org.name])).slice(0, 3);
  return (
    <>
      <div className={kicker}>Alliance / organisation</div>
      <h2 className="mr-11 flex items-center gap-3 text-[26px] leading-tight font-bold tracking-tight">
        <Medal id={org.id} size={40} />
        {org.name}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{org.purpose}</p>
      <div className="my-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-paper p-3.5">
          <div className="text-[26px] leading-none font-bold tabular-nums">
            <CountUp to={org.members.length} duration={0.8} />
          </div>
          <div className="mt-1.5 text-xs text-ink-2">member countries</div>
        </div>
        <div className="rounded-2xl bg-paper p-3.5">
          <div className="text-base leading-tight font-bold">{org.hq}</div>
          <div className="mt-1.5 text-xs text-ink-2">headquarters</div>
        </div>
      </div>
      <div className={kicker}>Members</div>
      <div className="flex flex-wrap gap-1.5">
        {org.members.map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1.5 text-xs font-semibold">
            <Flag iso3={m} className="h-[11px] w-4" />
            {countryName(m)}
          </span>
        ))}
      </div>
      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Latest news</h3>
        <NewsList items={related} empty={`No ${org.id} headlines from trusted outlets in the last 48 hours.`} />
      </section>
    </>
  );
}

function SummitPanel({ summit }: { summit: Pulse["summits"][number] }) {
  const news = useNews({ limit: 100 });
  const words = [summit.name.split(" ")[0], ...(summit.org ? [summit.org] : [])];
  const related = (news.data?.data ?? []).filter((n) => mentions(n, words)).slice(0, 3);
  const when = new Date(`${summit.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <div className={kicker}>Summit · upcoming</div>
      <h2 className="mr-11 text-[26px] leading-tight font-bold tracking-tight">{summit.name}</h2>
      <p className="mt-1 text-sm text-ink-2">
        {summit.host} · {when}
        {!summit.datesConfirmed && " (exact dates to be confirmed)"}
      </p>
      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Expected agenda</h3>
        <ol className="grid gap-3">
          {summit.agenda.map((a, i) => (
            <li key={a} className="grid grid-cols-[24px_1fr] gap-2.5 leading-relaxed">
              <span className="grid size-6 place-items-center rounded-full bg-[var(--ink-strong)] text-xs font-bold text-white">{i + 1}</span>
              {a}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Latest news</h3>
        <NewsList items={related} empty="No summit headlines from trusted outlets yet." />
      </section>
    </>
  );
}

function CountryShell({ country }: { country: IndexedCountry }) {
  return (
    <>
      <div className={kicker}>Relations</div>
      <h2 className="mr-11 flex items-center gap-2.5 text-[26px] leading-tight font-bold tracking-tight">
        <Flag iso3={country.iso3} className="h-[19px] w-7" />
        {country.name}
      </h2>
      <p className="mt-1 text-sm text-ink-2">Capital · leader · government type</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <section className="mt-5 border-t border-border pt-4">
        <h3 className={sectTitle}>Friends and rivals</h3>
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </section>
      <p className="mt-4 text-xs text-ink-3">Relations, numbers and news for {country.name} connect in the next steps.</p>
    </>
  );
}

/** Right panel on desktop, bottom sheet on phones; one panel at a time (UI-DESIGN §6). */
export function PanelHost() {
  const iso3 = useGlobe((s) => s.selectedIso3);
  const conflictId = useGlobe((s) => s.selectedConflict);
  const orgId = useGlobe((s) => s.selectedOrg);
  const summitId = useGlobe((s) => s.selectedSummit);
  const { data: pulse } = usePulse();
  const [countries, setCountries] = useState<IndexedCountry[]>([]);

  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      useGlobe.getState().closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const conflict = conflictId ? pulse?.data.conflicts.find((c) => c.id === conflictId) : undefined;
  const country = iso3 ? countries.find((c) => c.iso3 === iso3) : undefined;
  const org = orgId ? pulse?.data.organizations.find((o) => o.id === orgId) : undefined;
  const summit = summitId ? pulse?.data.summits.find((x) => x.id === summitId) : undefined;
  const nameOf = (iso3: string) => countries.find((c) => c.iso3 === iso3)?.name ?? iso3;
  const key = conflict ? `c-${conflict.id}` : org ? `o-${org.id}` : summit ? `s-${summit.id}` : country ? `k-${country.iso3}` : null;
  const label = conflict?.name ?? org?.name ?? summit?.name ?? country?.name ?? "";

  const close = () => useGlobe.getState().closePanel();

  return (
    <AnimatePresence>
      {key && (
        <motion.aside
          key={key}
          aria-live="polite"
          aria-label={`${label} details`}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed top-20 right-[22px] z-30 flex max-h-[calc(100%-104px)] w-[400px] flex-col rounded-[20px] bg-white/95 shadow-[var(--shadow-card)] backdrop-blur-xl max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[62%] max-md:w-auto max-md:rounded-b-none"
        >
          <button
            type="button"
            aria-label="Close panel"
            onClick={close}
            className="absolute top-3.5 right-3.5 z-10 grid size-9 place-items-center rounded-[10px] border border-border bg-white"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
          <div className="overflow-auto p-[22px]">
            {conflict ? (
              <ConflictPanel c={conflict} />
            ) : org ? (
              <BlocPanel org={org} countryName={nameOf} />
            ) : summit ? (
              <SummitPanel summit={summit} />
            ) : country ? (
              <CountryShell country={country} />
            ) : null}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
