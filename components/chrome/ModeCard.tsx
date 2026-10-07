"use client";

import { AnimatePresence, motion } from "motion/react";
import { timeAgo, useIndicators, useNews } from "@/lib/api";
import { MODE_COPY, MODE_SCALES, metricById, metricsFor, scaleDomain } from "@/lib/metrics";
import { Term } from "@/components/learn/Term";
import { useGlobe } from "@/lib/store";

/** Left card in Economy / Defense: question, metric chips, colour scale and the mode's news (UI-DESIGN §6). */
export function ModeCard() {
  const mode = useGlobe((s) => s.mode);
  const metricId = useGlobe((s) => (s.mode === "economy" || s.mode === "defense" ? s.modeMetric[s.mode] : null));
  const setMetric = useGlobe((s) => s.setModeMetric);
  const { data, isPending } = useIndicators(mode);
  const news = useNews({ section: mode === "economy" ? "economy" : "defense", limit: 3 });

  if (mode !== "economy" && mode !== "defense") return null;
  const copy = MODE_COPY[mode];
  const def = metricId ? metricById(metricId) : null;
  const metric = metricId ? data?.data[metricId] : undefined;
  const values = metric ? Object.values(metric.values).map((v) => v.value) : [];
  const domain = def ? scaleDomain(values, def.log) : null;
  const ends = domain && def ? [domain.lo, domain.hi].map((x) => def.format(def.log ? 10 ** x : x)) : null;
  const year = new Date().getUTCFullYear();

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={mode}
        aria-label={`${copy.title} mode`}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.35 }}
        className="fixed top-20 left-[22px] z-20 max-h-[calc(100%-190px)] w-[316px] overflow-auto rounded-[18px] bg-[var(--glass)] p-5 shadow-[var(--shadow-card)] backdrop-blur-xl max-md:inset-x-3 max-md:top-16 max-md:w-auto max-md:max-h-[40%]"
      >
        <h2 className="text-[22px] leading-tight font-bold tracking-tight">{copy.title}</h2>
        <p className="mt-1.5 mb-3 text-[12.5px] text-ink-2">{copy.question}</p>
        <div role="group" aria-label="Metric" className="flex flex-wrap gap-1.5">
          {metricsFor(mode).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metricId === m.id}
              onClick={() => setMetric(mode, m.id)}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink-2 aria-pressed:border-transparent aria-pressed:bg-[var(--ink-strong)] aria-pressed:text-white"
            >
              {m.label}
            </button>
          ))}
        </div>
        {def && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <b className="text-sm font-semibold">{def.term ? <Term id={def.term}>{def.title}</Term> : def.title}</b>
              {metric?.latestYear && (
                <small className="text-xs text-ink-3">
                  {metric.latestYear}
                  {metric.latestYear >= year && " estimate"}
                </small>
              )}
            </div>
            <div className="mt-2 h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${MODE_SCALES[mode].join(",")})` }} />
            <div className="mt-1.5 flex justify-between text-xs text-ink-3 tabular-nums">
              <span>{isPending ? "…" : (ends?.[0] ?? "")}</span>
              <span>{isPending ? "" : (ends?.[1] ?? "")}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-3">
              Source: {def.source}. Countries without data stay uncoloured. Tap a country for its numbers.
            </p>
          </div>
        )}
        <section className="mt-4 border-t border-border pt-3">
          <h3 className="mb-2 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Latest {copy.title.toLowerCase()} news</h3>
          {news.data?.data.length ? (
            <ul className="grid gap-2">
              {news.data.data.map((n) => (
                <li key={n.id} className="text-[13px] leading-snug">
                  <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                    {n.title}
                  </a>
                  <span className="block text-[11.5px] text-ink-3">
                    {n.source} · {timeAgo(n.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-3">No recent headlines from trusted outlets.</p>
          )}
        </section>
      </motion.aside>
    </AnimatePresence>
  );
}
