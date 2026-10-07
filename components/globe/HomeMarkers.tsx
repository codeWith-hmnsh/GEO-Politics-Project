"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { usePulse } from "@/lib/api";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { markerRegistry } from "@/lib/markers";
import { useGlobe } from "@/lib/store";
import { Medal } from "./emblems";
import { LANES, ships } from "./lanes";
import { useHomeLayerVisible } from "./layers/WarsLayer";
import { Marker } from "./Marker";

// Summit cards sit to the left of their city so they do not collide with conflict callouts (right side).
const SUMMIT_OFFSET: [number, number] = [-18, -20];

/** Summits whose month is this month or the next two. */
export function upcoming(month: string, now = new Date()) {
  const [y, m] = month.split("-").map(Number);
  const diff = (y - now.getUTCFullYear()) * 12 + (m - 1 - now.getUTCMonth());
  return diff >= 0 && diff <= 2;
}

function Ship({ id, lane, t }: { id: string; lane: number; t: number }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!el) return;
    markerRegistry.set(id, { el, v: [0, 0, 1] });
    ships.set(id, { lane, t, speed: 0.012 / 3 });
    return () => {
      markerRegistry.delete(id);
      ships.delete(id);
    };
  }, [el, id, lane, t]);
  return (
    <div ref={setEl} className="pointer-events-none absolute left-0 top-0" style={{ opacity: 0, visibility: "hidden" }}>
      <svg viewBox="0 0 40 16" width="40" height="16" className="-translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_3px_rgba(0,0,0,.45)]" aria-hidden>
        <path d="M2 9h34l-4 6H7z" fill="#fff" />
        <path d="M2 9h34l-.8 1.2H2.8z" fill="#C9D6DF" />
        <rect x="9" y="4" width="5" height="5" fill="#E8EEF2" />
        <rect x="14.5" y="4" width="5" height="5" fill="#F2B33D" />
        <rect x="20" y="4" width="5" height="5" fill="#E8EEF2" />
        <rect x="25.5" y="5" width="5" height="4" fill="#5B8DB8" />
        <rect x="31" y="2" width="3" height="7" fill="#fff" />
      </svg>
    </div>
  );
}

/** Bloc badges, summit callouts, crisis badges and ships (Home layers 2 and 3). */
export function HomeMarkers() {
  const { data } = usePulse();
  const orgsVisible = useHomeLayerVisible("orgs");
  const econVisible = useHomeLayerVisible("econ");
  const selectedOrg = useGlobe((s) => s.selectedOrg);
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  const pulse = data?.data;
  const byIso = new Map(countries.map((c) => [c.iso3, c]));
  const summits = (pulse?.summits ?? []).filter((s) => upcoming(s.month));

  const openOrg = (id: string) => {
    const s = useGlobe.getState();
    if (s.selectedOrg === id) return s.closePanel();
    s.selectOrg(id);
    const org = pulse?.organizations.find((o) => o.id === id);
    if (org) s.flyTo({ lat: org.pin[0], lng: org.pin[1], dist: id === "NATO" || id === "G20" ? 3.6 : 2.9 });
  };

  return (
    <>
      <div aria-label="Alliances and summits" className={`pointer-events-none fixed inset-0 z-[7] transition-opacity duration-500 ${orgsVisible ? "" : "opacity-0"}`}>
        {pulse?.organizations
          .filter((o) => o.shown || o.id === selectedOrg)
          .map((o) => (
            <Marker key={o.id} lat={o.pin[0]} lng={o.pin[1]} interactive={orgsVisible}>
              <button
                type="button"
                onClick={() => openOrg(o.id)}
                aria-pressed={selectedOrg === o.id}
                aria-label={`${o.name}: show members`}
                className="flex w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full aria-pressed:[&>span:first-child]:shadow-[0_0_0_4px_#f2b33d]"
              >
                <Medal id={o.id} />
                <small className="text-[10px] font-bold tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,.7)]">{o.id}</small>
              </button>
            </Marker>
          ))}
        {summits.map((s) => (
          <Marker key={s.id} lat={s.at[0]} lng={s.at[1]} offset={SUMMIT_OFFSET} interactive={orgsVisible}>
            <button
              type="button"
              onClick={() => {
                const st = useGlobe.getState();
                st.selectSummit(s.id);
                st.flyTo({ lat: s.at[0], lng: s.at[1], dist: 2.4 });
              }}
              className="flex -translate-x-full items-center gap-2.5 rounded-[10px] border border-white/15 bg-[var(--night)] py-2 pr-3 pl-2 text-left whitespace-nowrap text-white shadow-[0_10px_26px_rgba(0,0,0,.28)]"
            >
              {s.org ? <Medal id={s.org} size={30} /> : <span className="grid size-[30px] place-items-center rounded-full bg-summit text-xs font-bold">★</span>}
              <span>
                <b className="block text-[13px] font-bold">{s.name}</b>
                <small className="block text-[11.5px] text-white/70">
                  {new Date(`${s.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}
                  {!s.datesConfirmed && " · dates to be confirmed"}
                </small>
              </span>
              <ChevronRight className="size-4 opacity-60" aria-hidden />
            </button>
          </Marker>
        ))}
      </div>

      <div aria-label="Global economy" className={`pointer-events-none fixed inset-0 z-[6] transition-opacity duration-500 ${econVisible ? "" : "opacity-0"}`}>
        {(pulse?.crises ?? []).map((c) => {
          const country = byIso.get(c.iso3);
          if (!country) return null;
          return (
            <Marker key={c.iso3} lat={country.centroid[0]} lng={country.centroid[1]} interactive={econVisible}>
              <button
                type="button"
                title={`${country.name}: ${c.basis}`}
                aria-label={`${country.name} economic crisis: ${c.basis}`}
                onClick={() => {
                  const st = useGlobe.getState();
                  st.select(country.iso3);
                  st.flyTo({ lat: country.centroid[0], lng: country.centroid[1], dist: 2.8 });
                }}
                className="grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-mixed text-white shadow-[0_3px_10px_rgba(0,0,0,.3)]"
              >
                <AlertTriangle className="size-3" strokeWidth={2.6} aria-hidden />
              </button>
            </Marker>
          );
        })}
        {LANES.flatMap((lane, li) => {
          const count = li === 0 ? 4 : 2;
          return Array.from({ length: count }, (_, k) => (
            <Ship key={`${lane.id}-${k}`} id={`ship-${lane.id}-${k}`} lane={li} t={(k / count + li * 0.13) % 1} />
          ));
        })}
      </div>
    </>
  );
}
