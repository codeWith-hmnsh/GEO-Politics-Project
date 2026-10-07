"use client";

import { Play } from "lucide-react";
import { useGlobe } from "@/lib/store";
import { TOURS } from "@/lib/tours";

/** List of Story Tours, opened from "Stories" in the header. */
export function StoriesPanel() {
  return (
    <>
      <div className="mb-1.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase">Stories</div>
      <h2 className="mr-11 text-[26px] leading-tight font-bold tracking-tight">Guided tours</h2>
      <p className="mt-1 text-[13px] text-ink-2">Short, narrated flights around the globe that explain one big story. About a minute each.</p>
      <ul className="mt-4 grid gap-2.5">
        {TOURS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => useGlobe.getState().startTour(t.id)}
              className="grid w-full grid-cols-[40px_1fr] items-start gap-3 rounded-2xl bg-paper p-3.5 text-left hover:bg-[#ebe8e1]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-[var(--ink-strong)] text-white" aria-hidden>
                <Play className="size-4 translate-x-px" />
              </span>
              <span>
                <b className="block text-[15px] leading-snug font-semibold">{t.title}</b>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{t.summary}</span>
                <span className="mt-1 block text-xs text-ink-3">
                  {Math.round(t.duration_s / 10) * 10} s · {t.stops.length + 1} stops · reviewed {t.reviewed}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-3">Every tour ends with the latest headlines from trusted outlets. Press Space to pause, arrows to move, Esc to leave.</p>
    </>
  );
}
