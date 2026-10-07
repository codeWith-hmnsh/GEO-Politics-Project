"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadAdmin1, type IndexedCountry } from "@/lib/geo/countries";
import { latLngToVec3 } from "@/lib/geo/sphere";
import { useGlobe } from "@/lib/store";
import { segmentsGeometry } from "./shared";

/** Country borders; brighten as the camera comes closer (UI-DESIGN §4.1). */
export function CountryBorders({ countries }: { countries: IndexedCountry[] }) {
  const geometry = useMemo(
    () => segmentsGeometry(countries.flatMap((c) => c.polygons.map((p) => p[0])), 1.0016),
    [countries],
  );
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false }),
    [],
  );
  useFrame(() => {
    const d = useGlobe.getState().camera.dist;
    material.opacity = 0.42 + 0.38 * Math.max(0, Math.min(1, (2.4 - d) / 1.0));
  });
  return <lineSegments geometry={geometry} material={material} renderOrder={2} />;
}

function outlineFor(byIso: Map<string, IndexedCountry>, iso3: string | null) {
  const c = iso3 ? byIso.get(iso3) : undefined;
  return c ? segmentsGeometry(c.polygons.map((p) => p[0]), 1.0016) : null; // same radius as borders: no parallax doubling when tilted
}

/** Hovered country in white, selected country in gold. */
export function CountryOutlines({ countries }: { countries: IndexedCountry[] }) {
  const hover = useGlobe((s) => s.hoverIso3);
  const selected = useGlobe((s) => s.selectedIso3);
  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso3, c])), [countries]);
  const hoverGeo = useMemo(() => outlineFor(byIso, hover), [byIso, hover]);
  const selGeo = useMemo(() => outlineFor(byIso, selected), [byIso, selected]);
  useEffect(() => () => hoverGeo?.dispose(), [hoverGeo]);
  useEffect(() => () => selGeo?.dispose(), [selGeo]);
  return (
    <>
      {selGeo && (
        <lineSegments geometry={selGeo} renderOrder={3}>
          <lineBasicMaterial color="#f2b33d" transparent depthWrite={false} />
        </lineSegments>
      )}
      {hoverGeo && hover !== selected && (
        <lineSegments geometry={hoverGeo} renderOrder={3}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
        </lineSegments>
      )}
    </>
  );
}

const ADMIN_FROM = 2.05;

/** State / province lines, loaded per visible country once the camera is close (UI-DESIGN §4.4). */
export function AdminBorders({ countries }: { countries: IndexedCountry[] }) {
  const [geos, setGeos] = useState<Record<string, THREE.BufferGeometry>>({});
  const requested = useRef(new Set<string>());
  const frame = useRef(0);
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const centroids = useMemo(
    () => countries.map((c) => ({ iso3: c.iso3, v: new THREE.Vector3(...latLngToVec3(c.centroid[0], c.centroid[1])) })),
    [countries],
  );
  const camDir = useMemo(() => new THREE.Vector3(), []);


  useFrame(({ camera }) => {
    const d = useGlobe.getState().camera.dist;
    material.opacity = Math.max(0, Math.min(1, (2.0 - d) / 0.5)) * 0.55;
    if (d > ADMIN_FROM || frame.current++ % 30) return;
    camDir.copy(camera.position).normalize();
    for (const c of centroids) {
      if (requested.current.has(c.iso3) || c.v.dot(camDir) < 0.75) continue;
      requested.current.add(c.iso3);
      loadAdmin1(c.iso3).then((file) => {
        if (!file) return;
        const geo = segmentsGeometry(file.lines, 1.0019);
        setGeos((prev) => ({ ...prev, [c.iso3]: geo }));
      });
    }
  });

  return (
    <>
      {Object.entries(geos).map(([iso3, g]) => (
        <lineSegments key={iso3} geometry={g} material={material} renderOrder={2} />
      ))}
    </>
  );
}
