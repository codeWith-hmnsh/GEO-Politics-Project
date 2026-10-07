"use client";

import { ArrowLeftRight, X } from "lucide-react";
import { useEffect } from "react";
import capability from "@/data/curated/capability.json";
import { useIndicators } from "@/lib/api";
import { capabilityScores } from "@/lib/capability";
import type { IndexedCountry } from "@/lib/geo/countries";
import { MODE_COPY, metricsFor } from "@/lib/metrics";
import { useGlobe } from "@/lib/store";
import { Flag } from "./Flag";

const COLORS = ["#1f2a30", "#7c8fa3"] as const;

/** "Compare" button under a country name; the next country tapped becomes the second one. */
export function CompareButton() {
  const picking = useGlobe((s) => s.comparePicking);
  const start = useGlobe((s) => s.startCompare);
  return picking ? (
    <p role="status" className="mt-3 rounded-xl bg-[#fff1c7] px-3 py-2 text-[13px] font-semibold text-[#7a5200]">
      Tap another country on the globe to compare.
    </p>
  ) : (
    <button
      type="button"
      onClick={start}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-paper"
    >
      <ArrowLeftRight className="size-3.5" aria-hidden />
      Compare with…
    </button>
  );
}

/** Midpoint of two places on the sphere and a camera distance that keeps both in view. */
function frame(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const v = (p: [number, number]) => [Math.cos(p[0] * rad) * Math.cos(p[1] * rad), Math.cos(p[0] * rad) * Math.sin(p[1] * rad), Math.sin(p[0] * rad)];
  const [x1, y1, z1] = v(a);
  const [x2, y2, z2] = v(b);
  const [x, y, z] = [x1 + x2, y1 + y2, z1 + z2];
  const angle = Math.acos(Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2)));
  return {
    lat: Math.atan2(z, Math.hypot(x, y)) / rad,
    lng: Math.atan2(y, x) / rad,
    dist: Math.min(3.6, Math.max(2.2, 2 + angle * 1.5)),
  };
}

function Pair({ label, a, b, format }: { label: string; a?: number | null; b?: number | null; format: (v: number) => string }) {
  const max = Math.max(Math.abs(a ?? 0), Math.abs(b ?? 0), 1e-9);
  return (
    <li className="rounded-2xl bg-paper p-3.5">
      <div className="mb-2 text-xs font-semibold text-ink-2">{label}</div>
      {[a, b].map((v, i) => (
        <div key={i} className="grid grid-cols-[1fr_76px] items-center gap-2.5 text-sm">
          <span className="h-2.5 overflow-hidden rounded-full bg-white">
            <span className="block h-full rounded-full" style={{ width: `${v == null ? 0 : (Math.abs(v) / max) * 100}%`, background: COLORS[i] }} />
          </span>
          <span className="text-right font-bold tabular-nums">{v == null ? "No data" : format(v)}</span>
        </div>
      ))}
    </li>
  );
}

/** Two countries side by side: paired bars in neutral colours, never a "winner" (PRD §8 Compare). */
export function ComparePanel({ a, b }: { a: IndexedCountry; b: IndexedCountry }) {
  const mode = useGlobe((s) => s.mode) as "economy" | "defense";
  const { data } = useIndicators(mode);

  useEffect(() => {
    useGlobe.getState().flyTo(frame(a.centroid, b.centroid));
  }, [a, b]);

  const metrics = metricsFor(mode).filter((m) => m.id !== "capability");
  const scores =
    mode === "defense" && data
      ? capabilityScores(capability.items.map((r) => ({ ...r, personnel: data.data.personnel?.values[r.iso3]?.value })))
      : null;
  const sa = scores?.get(a.iso3);
  const sb = scores?.get(b.iso3);
  const exit = () => useGlobe.setState({ compareIso3: null, comparePicking: false });

  return (
    <>
      <div className="mb-1.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Compare · {MODE_COPY[mode].title}</div>
      <h2 className="mr-11 grid gap-1 text-[22px] leading-tight font-bold tracking-tight">
        {[a, b].map((c, i) => (
          <span key={c.iso3} className="flex items-center gap-2.5">
            <i className="size-3 rounded-full" style={{ background: COLORS[i] }} aria-hidden />
            <Flag iso3={c.iso3} className="h-4 w-6" />
            {c.name}
          </span>
        ))}
      </h2>
      <button
        type="button"
        onClick={exit}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-paper"
      >
        <X className="size-3.5" aria-hidden />
        Stop comparing
      </button>
      <ul className="mt-4 grid gap-2.5">
        {metrics.map((m) => {
          const d = data?.data[m.id];
          // The nuclear list covers every nuclear-armed state, so a missing value means none.
          const none = m.id === "nuclear" && d ? 0 : undefined;
          return (
            <Pair
              key={m.id}
              label={m.title}
              a={d?.values[a.iso3]?.value ?? none}
              b={d?.values[b.iso3]?.value ?? none}
              format={(v) => (m.id === "nuclear" && v === 0 ? "None" : m.format(v))}
            />
          );
        })}
        {mode === "defense" &&
          (["air", "land", "sea"] as const).map((k) => (
            <Pair key={k} label={`Capability: ${k} (estimate)`} a={sa?.[k]} b={sb?.[k]} format={(v) => `${v.toFixed(1)}/10`} />
          ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Bars show size only. Higher is not always better (think inflation or debt), and nothing here says who would &ldquo;win&rdquo;.
        Each value uses its latest year; see a single country for years and sources.
      </p>
    </>
  );
}
