"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useIndicators, usePulse } from "@/lib/api";
import type { IndexedCountry } from "@/lib/geo/countries";
import { MODE_SCALES, metricById, scaleColor, scaleDomain, scaleT } from "@/lib/metrics";
import { REL_COLORS, relationsFor } from "@/lib/relations";
import { useGlobe } from "@/lib/store";

/**
 * Transparent sphere just above the Earth painted from a 2D canvas: bloc member tint, disputed-area
 * hatching and (later) relation colours and choropleths (UI-DESIGN §4.1).
 */
export function DataOverlay({ countries, size = 4096 }: { countries: IndexedCountry[]; size?: number }) {
  const { gl } = useThree();
  const { data } = usePulse();
  const selectedOrg = useGlobe((s) => s.selectedOrg);
  const highlight = useGlobe((s) => s.highlight);
  const selectedIso3 = useGlobe((s) => s.selectedIso3);
  const compareIso3 = useGlobe((s) => s.compareIso3);
  const mode = useGlobe((s) => s.mode);
  const homeMode = mode === "home";
  const metricId = useGlobe((s) => (s.mode === "economy" || s.mode === "defense" ? s.modeMetric[s.mode] : null));
  const { data: indicators } = useIndicators(mode);
  const relVisible = useGlobe((s) => s.layers.rel && s.mode === "home");

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size / 2;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: t };
  }, [size]);

  useEffect(() => {
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const K = W / 4096;
    const X = (lng: number) => ((lng + 180) / 360) * W;
    const Y = (lat: number) => ((90 - lat) / 180) * H;
    ctx.clearRect(0, 0, W, H);

    const path = (c: IndexedCountry) => {
      ctx.beginPath();
      for (const r of c.outer) {
        for (const off of r.wrap ? [0, -W] : [0]) {
          r.pts.forEach(([lng, lat], i) => (i ? ctx.lineTo(X(lng) + off, Y(lat)) : ctx.moveTo(X(lng) + off, Y(lat))));
          ctx.closePath();
        }
      }
    };

    if (highlight.length) {
      const lit = new Set(highlight);
      ctx.fillStyle = "#f2b33da6";
      for (const c of countries) {
        if (!lit.has(c.iso3)) continue;
        path(c);
        ctx.fill("evenodd");
      }
    }

    const org = selectedOrg ? data?.data.organizations.find((o) => o.id === selectedOrg) : undefined;
    if (org) {
      const members = new Set(org.members);
      ctx.fillStyle = `${org.color}8c`; // ~55 % alpha
      for (const c of countries) {
        if (!members.has(c.iso3)) continue;
        path(c);
        ctx.fill("evenodd");
      }
    }

    // Choropleth for the active metric (Economy / Defense): one metric colours the globe at a time.
    const metric = metricId ? indicators?.data[metricId] : undefined;
    if (metricId && metric && (mode === "economy" || mode === "defense")) {
      const def = metricById(metricId);
      const domain = scaleDomain(Object.values(metric.values).map((v) => v.value), def.log);
      for (const c of countries) {
        const v = metric.values[c.iso3];
        if (!v) continue;
        const focus = c.iso3 === selectedIso3 || c.iso3 === compareIso3;
        ctx.fillStyle = focus ? "rgba(255,255,255,.88)" : scaleColor(MODE_SCALES[mode], scaleT(v.value, domain));
        ctx.globalAlpha = focus ? 1 : 0.82;
        path(c);
        ctx.fill("evenodd");
      }
      ctx.globalAlpha = 1;
    }

    // Relations of the selected country (Home): green / red / amber / blue (UI-DESIGN §4.3).
    if (selectedIso3 && homeMode && data) {
      const rel = relationsFor(selectedIso3, data.data.relations, data.data.organizations);
      const hasData = rel.size > 0;
      const alpha = { ally: "9e", hostile: "a8", mixed: "9e", neutral: "6b" } as const;
      for (const c of countries) {
        if (c.iso3 === selectedIso3) {
          ctx.fillStyle = "#f2b33db8";
        } else {
          const r = rel.get(c.iso3);
          const status = r ? r.status : "neutral";
          if (!r && !hasData) continue;
          ctx.fillStyle = REL_COLORS[status] + alpha[status];
        }
        path(c);
        ctx.fill("evenodd");
      }
    }

    if (relVisible && !selectedIso3 && data) {
      const p = document.createElement("canvas");
      p.width = p.height = 18;
      const pg = p.getContext("2d")!;
      pg.strokeStyle = "rgba(255,226,150,.95)";
      pg.lineWidth = 2.6;
      pg.beginPath();
      pg.moveTo(-2, 20);
      pg.lineTo(20, -2);
      pg.stroke();
      const hatch = ctx.createPattern(p, "repeat")!;
      for (const d of data.data.borders.disputed) {
        ctx.beginPath();
        (d.polygon as [number, number][]).forEach(([lat, lng], i) => (i ? ctx.lineTo(X(lng), Y(lat)) : ctx.moveTo(X(lng), Y(lat))));
        ctx.closePath();
        ctx.fillStyle = hatch;
        ctx.fill();
        ctx.setLineDash([8 * K, 6 * K]);
        ctx.lineWidth = 2 * K;
        ctx.strokeStyle = "rgba(255,226,150,.9)";
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    texture.needsUpdate = true;
  }, [canvas, texture, gl, countries, data, selectedOrg, selectedIso3, homeMode, relVisible, mode, metricId, indicators, highlight, compareIso3]);

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[1.0009, 200, 140]} />
      <meshLambertMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
