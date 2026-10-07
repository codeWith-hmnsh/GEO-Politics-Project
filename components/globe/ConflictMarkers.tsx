"use client";

import { ChevronRight } from "lucide-react";
import { Flag } from "@/components/chrome/Flag";
import { usePulse } from "@/lib/api";
import type { PulseConflict } from "@/lib/data/pulse";
import { useGlobe } from "@/lib/store";
import { useHomeLayerVisible } from "./layers/WarsLayer";
import { Marker } from "./Marker";

const CALLOUT_OFFSET: [number, number] = [22, -58];

export function daysSince(iso: string, now = Date.now()) {
  return Math.floor((now - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000);
}

export function openConflict(c: PulseConflict) {
  const s = useGlobe.getState();
  s.selectConflict(c.id);
  s.flyTo({ lat: c.at[0], lng: c.at[1], dist: 1.9 });
}

const STATUS_LABEL: Record<string, string> = { active: "Active", escalating: "Escalating", ceasefire: "Ceasefire", frozen: "Frozen" };

/** Click targets for every hotspot and dark callout cards for the top conflicts (UI-DESIGN §4.3). */
export function ConflictMarkers() {
  const { data } = usePulse();
  const visible = useHomeLayerVisible("wars");
  const conflicts = data?.data.conflicts ?? [];

  return (
    <div aria-label="Conflicts" inert={!visible} aria-hidden={!visible} className={`pointer-events-none fixed inset-0 z-[7] transition-opacity duration-500 ${visible ? "" : "opacity-0"}`}>
      {conflicts.map((c) => (
        <Marker key={c.id} lat={c.at[0]} lng={c.at[1]} interactive={visible}>
          <button
            type="button"
            onClick={() => openConflict(c)}
            title={c.name}
            aria-label={`${c.name}: open details`}
            className="block size-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          />
        </Marker>
      ))}
      {conflicts
        .filter((c) => c.callout)
        .map((c) => (
          <Marker key={`${c.id}-callout`} lat={c.at[0]} lng={c.at[1]} offset={CALLOUT_OFFSET} interactive={visible}>
            <button
              type="button"
              onClick={() => openConflict(c)}
              className="flex items-center gap-2.5 rounded-[10px] border border-white/15 bg-[var(--night)] py-2 pr-3 pl-2.5 text-left whitespace-nowrap text-white shadow-[0_10px_26px_rgba(0,0,0,.28)] hover:bg-[rgba(16,24,30,.96)]"
            >
              <span className="flex flex-col gap-[3px]">
                {c.flags.map((f) => (
                  <Flag key={f} iso3={f} className="block h-[13px] w-5" />
                ))}
              </span>
              <span>
                <b className="block text-[13px] font-bold">{c.name}</b>
                <small className="mt-0.5 block text-[11.5px] text-white/70">
                  <i className={`font-bold not-italic ${c.status === "ceasefire" ? "text-[#ffc966]" : "text-[#ff6b6f]"}`}>{STATUS_LABEL[c.status] ?? c.status}</i> •{" "}
                  {daysSince(c.start).toLocaleString()} days
                </small>
              </span>
              <ChevronRight className="ml-1 size-4 opacity-60" aria-hidden />
            </button>
          </Marker>
        ))}
    </div>
  );
}
