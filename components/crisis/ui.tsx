"use client";

import { useEffect, useRef, useState } from "react";
import { CHOICE_LOOK, METER_LOOK } from "@/lib/game/crisis/look";
import type { Choice, MeterDelta } from "@/lib/game/crisis/types";
import { METERS } from "@/lib/game/crisis/types";
import { cn } from "@/lib/utils";

/** Counts from the last shown value to the new one, so meter numbers roll instead of jumping. */
export function useRoll(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** Small chips for a meter change: icon + signed number, green up, red down. */
export function DeltaChips({ d, className }: { d: MeterDelta; className?: string }) {
  const items = METERS.filter((k) => d[k]);
  if (!items.length) return <span className={cn("text-[12px] font-semibold text-ink-3", className)}>No cost</span>;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {items.map((k) => {
        const v = d[k]!;
        const Icon = METER_LOOK[k].icon;
        return (
          <span key={k} title={METER_LOOK[k].name} className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11.5px] font-bold tabular-nums", v > 0 ? "bg-[rgba(47,163,107,.12)] text-[var(--up)]" : "bg-[rgba(229,72,77,.1)] text-[var(--down)]")}>
            <Icon className="size-3" aria-hidden />
            {v > 0 ? "+" : "−"}
            {Math.abs(v)}
          </span>
        );
      })}
    </span>
  );
}

export function ChoiceTag({ c, size = "sm" }: { c: Choice; size?: "sm" | "md" }) {
  const l = CHOICE_LOOK[c];
  const Icon = l.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-extrabold whitespace-nowrap", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12.5px]")} style={{ background: l.soft, color: l.ink }}>
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      {l.name}
    </span>
  );
}

/** A 0–100 meter as a thin bar with an optional ghost of the previous value. */
export function Bar({ v, prev, color, className }: { v: number; prev?: number; color: string; className?: string }) {
  return (
    <span className={cn("relative block h-1.5 overflow-hidden rounded-full bg-[#e7e3da]", className)} aria-hidden>
      {prev !== undefined && prev !== v && <i className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${Math.max(prev, v)}%`, background: v < prev ? "var(--down)" : color }} />}
      <i className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v}%`, background: color }} />
    </span>
  );
}
