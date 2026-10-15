"use client";

import { ArrowRight, ArrowUpRight, BookOpen, ChevronDown, Clock, Database, Play } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { MODES } from "@/components/chrome/ModeDock";
import glossary from "@/data/curated/glossary.json";
import { timeAgo, useBrief, usePulse } from "@/lib/api";
import { SEATS } from "@/lib/game/engine/types";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { loadCountries } from "@/lib/geo/countries";
import { useGlobe, type Mode } from "@/lib/store";
import { TOURS } from "@/lib/tours";
import { cn } from "@/lib/utils";

/**
 * Everything below the globe on Home. The globe hero scrolls away like the first screen of a long page;
 * any action that needs the globe (a mode, a story, the brief) brings the page back to the top first.
 */

const eyebrow = "text-[11px] font-extrabold uppercase tracking-[.16em] text-ink-3";
const h2 = "mt-3 font-display text-[clamp(34px,4.4vw,58px)] leading-[1.02] font-semibold tracking-[-.02em]";
const card = "rounded-[22px] border border-border bg-white shadow-[0_1px_2px_rgba(17,35,43,.04),0_12px_32px_rgba(17,35,43,.06)]";

const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

const MODE_TEXT: Record<Mode, { line: string; tint: string }> = {
  home: { line: "Wars, summits, alliances and who gets along with whom, live on one globe.", tint: "#e5484d" },
  economy: { line: "Growth, debt, inflation and trade: which economies lead and which are under strain.", tint: "#e8a21c" },
  defense: { line: "Military spending, troops and nuclear arsenals, compared country by country.", tint: "#4c74d9" },
  energy: { line: "Who produces oil and gas, who depends on imports, and the chokepoints in between.", tint: "#2fa36b" },
  diplomacy: { line: "UN votes, blocs and partnerships: how countries line up on the big questions.", tint: "#7a4fd0" },
};

export function HomeSections() {
  // Anything that changes the globe while the reader is down the page takes them back up to see it.
  useEffect(
    () =>
      useGlobe.subscribe((s, p) => {
        if (window.scrollY < 8) return;
        if (s.mode !== p.mode || s.sidePanel !== p.sidePanel || s.tour?.id !== p.tour?.id || s.selectedIso3 !== p.selectedIso3) toTop();
      }),
    [],
  );

  return (
    <div className="relative z-10 bg-paper">
      <Pulse />
      <Lenses />
      <Stories />
      <Brief />
      <Statecraft />
      <Learn />
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[13px] text-ink-3">
          <span className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full bg-[var(--ink-strong)]">
              <span className="relative block h-2.5 w-4">
                <span className="absolute top-0 left-0 size-2.5 rounded-full bg-gold" />
                <span className="absolute top-0 right-0 size-2.5 rounded-full border-2 border-white" />
              </span>
            </span>
            <b className="text-ink">GeoPolitics</b> · The world, explained
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 font-semibold">
            <Link href="/glossary" className="hover:text-ink">Glossary</Link>
            <Link href="/sources" className="hover:text-ink">Sources</Link>
            <Link href="/play" className="hover:text-ink">Statecraft</Link>
            <button type="button" onClick={toTop} className="hover:text-ink">Back to the globe ↑</button>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** The "scroll for more" cue at the foot of the globe hero. */
export function ScrollCue() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: window.innerHeight - 64, behavior: "smooth" })}
      className="group fixed bottom-[26px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-white/80 py-2 pr-3 pl-4 text-[12.5px] font-bold text-ink-2 shadow-[var(--shadow-card)] backdrop-blur-xl transition hover:text-ink max-[1580px]:hidden"
    >
      Scroll to explore
      <ChevronDown className="size-4 transition group-hover:translate-y-0.5 motion-safe:animate-bounce" aria-hidden />
    </button>
  );
}

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto max-w-[1240px] px-5 py-24 max-md:py-16", className)}>
      {children}
    </section>
  );
}

// ───────── The world right now ─────────

function Pulse() {
  const { data } = usePulse();
  const [countries, setCountries] = useState<number | null>(null);
  useEffect(() => {
    loadCountries()
      .then((l) => setCountries(l.length))
      .catch(() => setCountries(null));
  }, []);
  const p = data?.data;
  const stats: [string, number | null | undefined, string][] = [
    ["Active conflicts", p?.conflicts.filter((c) => c.status === "active").length, "tracked from trusted reporting"],
    ["Countries mapped", countries, "every border, every capital"],
    ["Relationships", p?.relations.length, "allies, rivals and everything between"],
    ["Alliances and blocs", p?.organizations.length, "from NATO to BRICS"],
  ];
  const hot = [...(p?.conflicts ?? [])].sort((a, b) => b.intensity - a.intensity).slice(0, 4);
  return (
    <Section className="pt-28">
      <motion.div {...reveal} className="grid grid-cols-[1fr_auto] items-end gap-6 max-md:grid-cols-1">
        <div>
          <div className={eyebrow}>The world right now</div>
          <h2 className={h2}>
            One globe. <em className="font-medium text-ink-2">Every story on it.</em>
          </h2>
        </div>
        <p className="max-w-[40ch] text-[16px] text-ink-2">
          Wars, money and power, joined up on one living map and updated as the news moves.
          {data?.asOf && <span className="mt-1 block text-[13px] font-semibold text-ink-3">Updated {timeAgo(data.asOf)}</span>}
        </p>
      </motion.div>

      <div className="mt-12 grid grid-cols-4 gap-4 max-lg:grid-cols-2">
        {stats.map(([label, value, sub], i) => (
          <motion.div key={label} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className={cn(card, "p-6")}>
            <div className="font-display text-[54px] leading-none font-semibold tracking-tight tabular-nums max-md:text-[42px]">{value ?? <span className="text-ink-3/40">—</span>}</div>
            <div className="mt-3 text-[14.5px] font-bold">{label}</div>
            <div className="text-[13px] text-ink-3">{sub}</div>
          </motion.div>
        ))}
      </div>

      {hot.length > 0 && (
        <motion.div {...reveal} className={cn(card, "mt-4 overflow-hidden")}>
          <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
            <span className="flex items-center gap-2.5 text-[14px] font-bold">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full rounded-full bg-[var(--conflict)] opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[var(--conflict)]" />
              </span>
              Watchlist
            </span>
            <button
              type="button"
              onClick={() => {
                const s = useGlobe.getState();
                s.setMode("home");
                if (!s.layers.wars) s.toggleLayer("wars");
                toTop();
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-2 hover:text-ink"
            >
              See them on the globe <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
          <ul className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {hot.map((c) => (
              <li key={c.id} className="border-border p-6 not-last:border-r max-lg:border-b max-lg:nth-[2n]:border-r-0 max-sm:border-r-0">
                <div className="flex items-center gap-2">
                  <Intensity n={c.intensity} />
                  <span className="text-[11px] font-extrabold tracking-[.12em] text-ink-3 uppercase">{c.status === "ceasefire" ? "Ceasefire" : "Active"} · since {c.start.slice(0, 4)}</span>
                </div>
                <h3 className="mt-2.5 text-[17px] leading-snug font-bold">{c.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{c.why[0]}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </Section>
  );
}

function Intensity({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Intensity ${n} of 3`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={cn("h-3 w-1 rounded-full", i <= n ? "bg-[var(--conflict)]" : "bg-[rgba(17,35,43,.12)]")} />
      ))}
    </span>
  );
}

// ───────── Five lenses ─────────

function Lenses() {
  const setMode = useGlobe((s) => s.setMode);
  const open = (id: Mode) => {
    const s = useGlobe.getState();
    s.select(null);
    if (s.mode !== id) setMode(id);
    toTop();
  };
  return (
    <Section>
      <motion.div {...reveal}>
        <div className={eyebrow}>Five lenses</div>
        <h2 className={h2}>Read the same world five ways.</h2>
        <p className="mt-4 max-w-[56ch] text-[16.5px] text-ink-2">Switch a lens and the whole globe re-colours: the same countries, seen through conflict, money, force, energy or votes.</p>
      </motion.div>
      <div className="mt-12 grid grid-cols-6 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {MODES.filter((m) => m.enabled).map(({ id, label, Icon }, i) => (
          <motion.button
            key={id}
            type="button"
            {...reveal}
            transition={{ ...reveal.transition, delay: i * 0.05 }}
            onClick={() => open(id)}
            aria-label={`Open the ${label} lens on the globe`}
            className={cn(
              "group relative flex min-h-[230px] flex-col overflow-hidden rounded-[22px] p-6 text-left transition duration-300 hover:-translate-y-1",
              i === 0
                ? "col-span-3 bg-[var(--ink-strong)] text-white shadow-[0_24px_60px_rgba(15,29,36,.28)] max-lg:col-span-2 max-sm:col-span-1"
                : i < 2
                  ? cn(card, "col-span-3 hover:shadow-[var(--shadow-card)] max-lg:col-span-1")
                  : cn(card, "col-span-2 hover:shadow-[var(--shadow-card)] max-lg:col-span-1"),
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full opacity-[.16] blur-2xl transition-opacity duration-500 group-hover:opacity-30"
              style={{ background: MODE_TEXT[id].tint }}
            />
            <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `${MODE_TEXT[id].tint}${i === 0 ? "33" : "1f"}`, color: i === 0 ? "#fff" : MODE_TEXT[id].tint }}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="mt-auto pt-10">
              <span className={cn("block font-display font-semibold tracking-tight", i === 0 ? "text-[34px]" : "text-[26px]")}>{label}</span>
              <span className={cn("mt-1.5 block max-w-[44ch] text-[14.5px] leading-relaxed", i === 0 ? "text-white/70" : "text-ink-2")}>{MODE_TEXT[id].line}</span>
            </span>
            <span className={cn("mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold", i === 0 ? "text-[var(--gold)]" : "text-ink")}>
              Open on the globe <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </span>
          </motion.button>
        ))}
      </div>
    </Section>
  );
}

// ───────── Story Tours ─────────

function Stories() {
  const start = useGlobe((s) => s.startTour);
  return (
    <Section>
      <motion.div {...reveal} className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className={eyebrow}>Story Tours</div>
          <h2 className={h2}>Two minutes. One big story.</h2>
          <p className="mt-4 max-w-[52ch] text-[16.5px] text-ink-2">The globe flies you through the places that matter, with a short caption at every stop.</p>
        </div>
      </motion.div>
      <div className="mt-12 grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {TOURS.map((t, i) => (
          <motion.article key={t.id} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.06 }} className={cn(card, "group flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]")}>
            <div className="flex items-center justify-between text-[12px] font-bold text-ink-3">
              <span className="font-display text-[30px] leading-none font-semibold text-ink/15">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden /> {Math.round(t.duration_s / 60)} min
                </span>
                <span>{t.stops.length} stops</span>
              </span>
            </div>
            <h3 className="mt-5 font-display text-[23px] leading-tight font-semibold">{t.title}</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-2">{t.summary}</p>
            <button
              type="button"
              onClick={() => start(t.id)}
              aria-label={`Watch the story tour: ${t.title}`}
              className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-[var(--ink-strong)] py-2 pr-4 pl-3 text-[13px] font-bold text-white transition group-hover:bg-[#1b313b] active:scale-[.97]"
            >
              <Play className="size-3.5 fill-current" aria-hidden /> Watch
            </button>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}

// ───────── Today's brief ─────────

function Brief() {
  const { data } = useBrief();
  const items = data?.data.slice(0, 4) ?? [];
  if (!items.length) return null;
  return (
    <Section>
      <div className="grid grid-cols-[.8fr_1.2fr] gap-12 max-lg:grid-cols-1">
        <motion.div {...reveal}>
          <div className={eyebrow}>Today&apos;s brief</div>
          <h2 className={h2}>What changed today.</h2>
          <p className="mt-4 max-w-[40ch] text-[16.5px] text-ink-2">The top stories, ranked by how many trusted outlets carry them. Each one can be shown on the globe.</p>
          <button
            type="button"
            onClick={() => useGlobe.getState().openSide("brief")}
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ink-strong)] px-6 text-[14.5px] font-bold text-white shadow-[0_8px_22px_rgba(15,29,36,.22)] transition hover:bg-[#1b313b] active:scale-[.97]"
          >
            Read the full brief <ArrowRight className="size-4" aria-hidden />
          </button>
        </motion.div>
        <ol className={cn(card, "divide-y divide-border overflow-hidden")}>
          {items.map((n, i) => (
            <motion.li key={n.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
              <a href={n.url} target="_blank" rel="noreferrer" className="group grid grid-cols-[44px_1fr_auto] items-start gap-4 px-6 py-5 transition hover:bg-paper/60">
                <span className="font-display text-[26px] leading-none font-semibold text-ink/25 tabular-nums">{i + 1}</span>
                <span>
                  <span className="block text-[16px] leading-snug font-bold group-hover:underline">{n.title}</span>
                  <span className="mt-1.5 block text-[12.5px] font-semibold text-ink-3">
                    {n.source} · {timeAgo(n.publishedAt)}
                    {n.sourceCount > 1 && ` · ${n.sourceCount} outlets`}
                  </span>
                </span>
                <ArrowUpRight className="mt-1 size-4 text-ink-3 transition group-hover:text-ink" aria-hidden />
              </a>
            </motion.li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

// ───────── Statecraft ─────────

function Statecraft() {
  return (
    <section className="px-5 py-10">
      <motion.div
        {...reveal}
        className="relative mx-auto grid max-w-[1240px] grid-cols-[1.1fr_.9fr] items-center gap-10 overflow-hidden rounded-[32px] bg-[var(--ink-strong)] px-14 py-16 text-white shadow-[0_30px_80px_rgba(15,29,36,.3)] max-lg:grid-cols-1 max-md:px-7 max-md:py-12"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_30%,rgba(242,179,61,.22),transparent_60%),radial-gradient(50%_60%_at_10%_100%,rgba(76,116,217,.22),transparent_60%)]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-40 size-[460px] rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-8 -bottom-24 size-[300px] rounded-full border border-white/10" />
        <div className="relative">
          <div className="text-[11px] font-extrabold tracking-[.16em] text-[var(--gold)] uppercase">Statecraft · geopolitics you play</div>
          <h2 className="mt-3 font-display text-[clamp(40px,5vw,68px)] leading-[.98] font-semibold tracking-[-.03em]">
            Now run a country <em className="font-medium text-white/70">yourself.</em>
          </h2>
          <p className="mt-5 max-w-[46ch] text-[17px] text-white/70">Six leaders, twelve years, one shared world. Make deals, ride out oil shocks and climb the World Power Index. About 20 minutes, free, no login.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/play" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#F7C65E] to-[var(--gold)] px-6 text-[15px] font-bold text-[var(--ink-strong)] shadow-[0_10px_28px_rgba(242,179,61,.35)] transition active:scale-[.97]">
              Play Statecraft <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/play/match" className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-5 text-[14.5px] font-bold text-white/90 transition hover:bg-white/10">
              Jump into a match
            </Link>
          </div>
        </div>
        <ul className="relative grid grid-cols-3 gap-3 max-sm:grid-cols-2">
          {SEATS.map((s) => (
            <li key={s} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-3.5 backdrop-blur">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 2px ${SEAT_COLOR[s]}` }}>
                <Flag iso3={s} className="h-10 w-14 scale-110" />
              </span>
              <span className="text-[13.5px] font-bold">{SHORT[s]}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

// ───────── Learn the words, check the sources ─────────

function Learn() {
  const terms = glossary.terms.slice(0, 14);
  return (
    <Section>
      <div className="grid grid-cols-[1.25fr_.75fr] gap-4 max-lg:grid-cols-1">
        <motion.div {...reveal} className={cn(card, "p-8 max-md:p-6")}>
          <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(76,116,217,.12)] text-[var(--neutral)]">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <h2 className="mt-6 font-display text-[34px] leading-tight font-semibold">Words that run the world.</h2>
          <p className="mt-2 max-w-[52ch] text-[15px] text-ink-2">{glossary.terms.length} terms, from sanctions to deterrence, each explained in two plain sentences.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {terms.map((t) => (
              <Link key={t.id} href={`/glossary#${t.id}`} className="rounded-full border border-border bg-paper/60 px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 transition hover:border-ink/30 hover:bg-white hover:text-ink">
                {t.term}
              </Link>
            ))}
            <Link href="/glossary" className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-bold text-ink hover:underline">
              All terms <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </motion.div>
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }} className={cn(card, "flex flex-col p-8 max-md:p-6")}>
          <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(47,163,107,.12)] text-[var(--ally)]">
            <Database className="size-5" aria-hidden />
          </span>
          <h2 className="mt-6 font-display text-[34px] leading-tight font-semibold">Show your sources.</h2>
          <p className="mt-2 flex-1 text-[15px] text-ink-2">Headlines come from trusted outlets, maps from Natural Earth and NASA. A story is marked verified only when two independent outlets report it.</p>
          <Link href="/sources" className="mt-6 inline-flex items-center gap-1.5 self-start text-[14px] font-bold hover:underline">
            Where the data comes from <ArrowRight className="size-4" aria-hidden />
          </Link>
        </motion.div>
      </div>
    </Section>
  );
}
