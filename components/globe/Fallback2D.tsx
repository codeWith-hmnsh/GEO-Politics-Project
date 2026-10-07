"use client";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { usePulse } from "@/lib/api";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { REL_COLORS, relationsFor } from "@/lib/relations";
import { useGlobe } from "@/lib/store";

/** Flat map for devices without WebGL (PRD FR-L-04): same data, same panels. */
export function Fallback2D() {
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const { data } = usePulse();
  const selected = useGlobe((s) => s.selectedIso3);

  useEffect(() => {
    // No camera flight here, so end the intro straight away.
    useGlobe.getState().finishIntro();
    loadCountries().then(setCountries).catch(() => setCountries([]));
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const features = useMemo(
    () =>
      countries.map((c) => ({
        type: "Feature" as const,
        properties: { iso3: c.iso3, name: c.name },
        geometry: { type: "MultiPolygon" as const, coordinates: c.polygons },
      })),
    [countries],
  );
  const projection = useMemo(
    () => geoNaturalEarth1().fitExtent([[16, 90], [size.w - 16, size.h - 120]], { type: "Sphere" }),
    [size],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const rel = selected && data ? relationsFor(selected, data.data.relations, data.data.organizations) : null;

  return (
    <div className="fixed inset-0" role="region" aria-label="World map (2D view because 3D is not available on this device)">
      <svg width={size.w} height={size.h} className="block">
        <path d={path({ type: "Sphere" }) ?? undefined} fill="#1c4a66" />
        {features.map((f) => {
          const iso3 = f.properties.iso3;
          const r = rel?.get(iso3);
          const fill = iso3 === selected ? "#f2b33d" : rel ? REL_COLORS[r?.status ?? "neutral"] : "#7d8f5a";
          return (
            <path
              key={iso3}
              d={path(f) ?? undefined}
              fill={fill}
              fillOpacity={rel && !r && iso3 !== selected ? 0.45 : 0.9}
              stroke="#ffffff"
              strokeOpacity={0.5}
              strokeWidth={0.5}
              onClick={() => useGlobe.getState().select(iso3)}
              className="cursor-pointer"
            >
              <title>{f.properties.name}</title>
            </path>
          );
        })}
        {(data?.data.conflicts ?? []).map((c) => {
          const p = projection([c.at[1], c.at[0]]);
          if (!p) return null;
          return (
            <circle key={c.id} cx={p[0]} cy={p[1]} r={4 + c.intensity * 3} fill="#e5484d" fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} className="cursor-pointer" onClick={() => useGlobe.getState().selectConflict(c.id)}>
              <title>{c.name}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
