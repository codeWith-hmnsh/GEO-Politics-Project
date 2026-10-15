"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
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
import { GameLayers } from "./game/GameLayers";
import { MarkerProjector } from "./MarkerProjector";
import { PerfGuard } from "./PerfGuard";

/** The WebGL globe. Mounted once; layers are added on top in later milestones. `game` swaps the explore layers for Statecraft layers. */
export default function GlobeCanvas({ game = false }: { game?: boolean }) {
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  const cloudsDimmed = useGlobe((s) => s.mode !== "home" || s.selectedIso3 !== null);
  const [mobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  // Light globe on weak devices (ARCHITECTURE §3.5): no clouds, fewer polygons, lower resolution, half the arcs.
  const light = useGlobe((s) => s.tier === 1);

  // Pages that scroll the globe away (Home) stop rendering it while it is off screen.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      ref={canvasRef}
      frameloop={onScreen ? "always" : "never"}
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
      {countries.length > 0 &&
        (game ? (
          <>
            <GameLayers countries={countries} size={light || mobile ? 2048 : 4096} />
            <CountryBorders countries={countries} />
            <CountryOutlines countries={countries} />
            <AdminBorders countries={countries} />
          </>
        ) : (
          <>
            <DataOverlay countries={countries} size={light || mobile ? 2048 : 4096} />
            <CountryBorders countries={countries} />
            <CountryOutlines countries={countries} />
            <AdminBorders countries={countries} />
            <RelationsLayer countries={countries} />
            <TradeLayer countries={countries} />
            <SanctionsLayer countries={countries} />
          </>
        ))}
      {!game && <WarsLayer />}
      {!game && <EconomyLayer />}
      <CameraRig countries={countries} />
      <MarkerProjector />
      <PerfGuard />
    </Canvas>
  );
}
