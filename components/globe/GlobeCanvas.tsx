"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { Atmosphere } from "./Atmosphere";
import { AdminBorders, CountryBorders, CountryOutlines } from "./Borders";
import { CameraRig } from "./CameraRig";
import { Clouds } from "./Clouds";
import { Earth } from "./Earth";
import { DataOverlay } from "./DataOverlay";
import { EconomyLayer } from "./layers/EconomyLayer";
import { RelationsLayer } from "./layers/RelationsLayer";
import { SanctionsLayer } from "./layers/SanctionsLayer";
import { TradeLayer } from "./layers/TradeLayer";
import { WarsLayer } from "./layers/WarsLayer";
import { MarkerProjector } from "./MarkerProjector";
import { PerfGuard } from "./PerfGuard";

/** The WebGL globe. Mounted once; layers are added on top in later milestones. */
export default function GlobeCanvas() {
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  const cloudsDimmed = useGlobe((s) => s.mode !== "home" || s.selectedIso3 !== null);
  const [mobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  // Light globe on weak devices (ARCHITECTURE §3.5): no clouds, fewer polygons, lower resolution, half the arcs.
  const light = useGlobe((s) => s.tier === 1);

  useEffect(() => {
    let alive = true;
    loadCountries()
      .then((list) => alive && setCountries(list))
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={light ? [1, 1.25] : [1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 34, near: 0.005, far: 200, position: [0, 0, 6.5] }}
      role="application"
      aria-label="Interactive 3D globe. Drag to rotate, scroll to zoom toward the cursor, tap a country to select it."
    >
      <Suspense fallback={null}>
        <Earth segments={light ? 96 : mobile ? 128 : 200} />
        {!light && <Clouds dimmed={cloudsDimmed} />}
      </Suspense>
      <Atmosphere />
      {countries.length > 0 && (
        <>
          <DataOverlay countries={countries} size={light || mobile ? 2048 : 4096} />
          <CountryBorders countries={countries} />
          <CountryOutlines countries={countries} />
          <AdminBorders countries={countries} />
          <RelationsLayer countries={countries} />
          <TradeLayer countries={countries} />
          <SanctionsLayer countries={countries} />
        </>
      )}
      <WarsLayer />
      <EconomyLayer />
      <CameraRig countries={countries} />
      <MarkerProjector />
      <PerfGuard />
    </Canvas>
  );
}
