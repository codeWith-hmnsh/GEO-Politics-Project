"use client";

import type { Trend } from "@/lib/game/engine/types";
import { cn } from "@/lib/utils";

/** Glass surface used by every game panel (same look as the 1.0 cards). */
export const glass = "rounded-[18px] bg-[var(--glass)] shadow-[var(--shadow-card)] backdrop-blur-xl";
export const eyebrow = "text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-3";

const BG = ["#E9DCC6", "#D9E4EA", "#E7D3D8", "#D8E6D6", "#E6E0F0", "#F0E2C9", "#DCE0E4", "#EAD9CF"];
const SKIN = ["#8D5A3B", "#C68E63", "#E1B48B", "#6B4630", "#F1C9A5", "#A86E4A", "#D59F7A", "#7A5039"];
const HAIR = ["#1B1B1B", "#3B2A20", "#7B7B7B", "#2B1B12", "#C9C3B6", "#4A3326", "#111", "#5A4636"];

/** One of 8 illustrated leader portraits (GAME-DESIGN §17). No real faces. */
export function Portrait({ i, seat, size = 34, className }: { i: number; seat: string; size?: number; className?: string }) {
  const k = ((i % 8) + 8) % 8;
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${seat}` }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect width="40" height="40" fill={BG[k]} />
        <path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill={seat} />
        <circle cx="20" cy="17" r="8" fill={SKIN[k]} />
        <path
          d={k % 2 ? "M11.5 16c0-6 4-9.5 8.5-9.5s8.5 3.5 8.5 9.5c-2-3-5-4.5-8.5-4.5S13.5 13 11.5 16z" : "M12 15c1-5 4.5-7.5 8-7.5s7 2.5 8 7.5c-3-1.5-5-3.5-8-3.5s-5 2-8 3.5z"}
          fill={HAIR[k]}
        />
      </svg>
    </span>
  );
}

/** Value change with direction glyph and colour (UI-DESIGN §3 rule 4). */
export function Delta({ v, d = 1, invert = false, unit = "", className }: { v: number; d?: number; invert?: boolean; unit?: string; className?: string }) {
  if (Math.abs(v) < Math.pow(10, -d) / 2) return <span className={cn("font-bold tabular-nums text-ink-3", className)}>±0{unit}</span>;
  const good = invert ? v < 0 : v > 0;
  return (
    <span className={cn("font-bold whitespace-nowrap tabular-nums", good ? "text-[var(--up)]" : "text-[var(--down)]", className)}>
      {v > 0 ? "▲" : "▼"} {Math.abs(v).toFixed(d)}
      {unit}
    </span>
  );
}

export function TrendChip({ t }: { t: Trend }) {
  const style = t === "improving" ? "bg-[rgba(47,163,107,.12)] text-[#1f7a4f]" : t === "worsening" ? "bg-[rgba(229,72,77,.12)] text-[#b5313a]" : "bg-[rgba(17,35,43,.06)] text-ink-3";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] font-bold", style)}>
      {t === "improving" ? "▲" : t === "worsening" ? "▼" : "●"} {t}
    </span>
  );
}

/** "Moves left" dots (Political Capital, in plain words). */
export function MoveDots({ left, total }: { left: number; total: number }) {
  return (
    <span role="img" className="flex gap-1" aria-label={`${left} of ${total} moves left`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={cn("size-2.5 rounded-full transition-colors", i < left ? "bg-[var(--ink-strong)]" : "bg-[#e2ded4]")} />
      ))}
    </span>
  );
}

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "glass" | "ghost" | "gold" }) {
  const v = {
    primary: "bg-[var(--ink-strong)] text-white shadow-[0_8px_22px_rgba(15,29,36,.25)] hover:bg-[#1b313b]",
    glass: "border border-[rgba(17,35,43,.16)] bg-white/80 text-ink hover:bg-white",
    ghost: "text-ink-2 hover:bg-[rgba(17,35,43,.05)] hover:text-ink",
    gold: "bg-gradient-to-b from-[#F7C65E] to-[var(--gold)] text-[var(--ink-strong)] shadow-[0_8px_22px_rgba(185,130,26,.35)]",
  }[variant];
  return (
    <button
      type="button"
      {...p}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-bold whitespace-nowrap transition active:scale-[.97] disabled:pointer-events-none disabled:opacity-45",
        v,
        className,
      )}
    />
  );
}
