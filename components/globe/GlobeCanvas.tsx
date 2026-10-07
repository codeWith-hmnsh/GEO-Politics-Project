"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { Atmosphere } from "./Atmosphere";
import { AdminBorders, CountryBorders, CountryOutlines } from "./Borders";
import { CameraRig } from "./CameraRig";
import { Clouds } from "./Clouds";
import { Earth } from "./Earth";
import { DataOverlay } from "./DataOverlay";
import { EconomyLayer } from "./layers/EconomyLayer";
import { RelationsLayer } from "./layers/RelationsLayer";
import { WarsLayer } from "./layers/WarsLayer";
import { MarkerProjector } from "./MarkerProjector";

/** The WebGL globe. Mounted once; layers are added on top in later milestones. */
export default function GlobeCanvas() {
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  const [mobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);

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
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 34, near: 0.005, far: 200, position: [0, 0, 6.5] }}
      aria-label="Interactive 3D globe. Drag to rotate, scroll to zoom toward the cursor, tap a country to select it."
    >
      <Suspense fallback={null}>
        <Earth segments={mobile ? 128 : 200} />
        <Clouds />
      </Suspense>
      <Atmosphere />
      {countries.length > 0 && (
        <>
          <DataOverlay countries={countries} size={mobile ? 2048 : 4096} />
          <CountryBorders countries={countries} />
          <CountryOutlines countries={countries} />
          <AdminBorders countries={countries} />
          <RelationsLayer countries={countries} />
        </>
      )}
      <WarsLayer />
      <EconomyLayer />
      <CameraRig countries={countries} />
      <MarkerProjector />
    </Canvas>
  );
}
