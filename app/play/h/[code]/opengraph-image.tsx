import { ImageResponse } from "next/og";
import { SCENARIO_NAME, decodeShare } from "@/lib/game/share";
import { NAMES, SEAT_COLOR } from "@/lib/game/text";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Statecraft match result";

// Social preview for a shared result (GAME-DESIGN §13): the share card on paper.
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const s = decodeShare((await params).code);
  const seat = s ? SEAT_COLOR[s.c] : "#11232B";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F3F1EC", padding: 56, fontFamily: "serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FBF7EE", border: "2px solid rgba(122,92,46,.25)", borderRadius: 28, padding: 48, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -90, top: -90, width: 360, height: 360, borderRadius: 999, background: "radial-gradient(circle at 35% 35%, #cfe3f2, #7aa2bd 55%, #3d6a85)", opacity: 0.45 }} />
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#7A5C2E", fontFamily: "sans-serif", fontWeight: 800 }}>MY STATECRAFT{s ? ` · ${SCENARIO_NAME[s.sc].toUpperCase()}` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 22, height: 120, borderRadius: 11, background: seat }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 96, color: "#11232B", lineHeight: 1 }}>{s ? NAMES[s.c] : "Statecraft"}</div>
              <div style={{ fontSize: 30, color: "#5E6B70", fontFamily: "sans-serif" }}>{s ? `${s.l} · ${s.y0}–${s.y1}` : "Run a country. Shape the world."}</div>
            </div>
          </div>
          {s ? (
            <div style={{ display: "flex", gap: 20, fontFamily: "sans-serif" }}>
              {[
                [`#${s.r0} → #${s.r1}`, "Power rank"],
                [String(s.s), s.w ? "Leader Score · Winner" : "Leader Score"],
                [String(s.g), "Regions led"],
              ].map(([v, l]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,.75)", borderRadius: 18, padding: "18px 26px" }}>
                  <div style={{ fontSize: 46, fontWeight: 800, color: "#11232B" }}>{v}</div>
                  <div style={{ fontSize: 22, color: "#5E6B70", fontWeight: 700 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div style={{ display: "flex", fontSize: 34, fontStyle: "italic", color: "#3d2f18" }}>{s ? `“${s.a}”` : "Lead a real country for twelve years."}</div>
        </div>
      </div>
    ),
    size,
  );
}
