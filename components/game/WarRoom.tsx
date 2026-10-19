"use client";

import { useEffect } from "react";
import { useGame } from "@/lib/game/store";
import { cn } from "@/lib/utils";

/** Situation-room theme: puts `war` on <html> while a game screen is mounted, so sheets and other portals go dark too. */
export function useWarRoom() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("war");
    return () => html.classList.remove("war");
  }, []);
}

/** Escalation level 1–5 from world tension (0–100). */
export function escalation(tension: number) {
  return Math.max(1, Math.min(5, Math.ceil(tension / 20)));
}

/** Escalation pips, after a DEFCON-style meter: amber, then red and glowing from level 4. */
export function EscalationPips({ tension, className }: { tension: number; className?: string }) {
  const lvl = escalation(tension);
  return (
    <span role="img" aria-label={`World tension ${tension.toFixed(0)}, escalation ${lvl} of 5`} className={cn("flex gap-[3px]", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={cn(
            "h-1.5 w-[18px] rounded-[1px] transition-colors duration-700",
            i > lvl ? "bg-white/12" : lvl >= 4 ? "bg-[var(--alert)] shadow-[0_0_10px_var(--alert)]" : "bg-[#fbbf24]",
          )}
        />
      ))}
    </span>
  );
}

/** Film treatment over the globe: vignette, scanlines, grain, a red alarm edge when tension runs high, letterbox bars during the reveal. */
export function WarRoomFx() {
  const tension = useGame((s) => s.world?.tension ?? 0);
  const phase = useGame((s) => s.phase);
  const shock = useGame((s) => s.phase === "reveal" && !!s.record?.eventId);
  const level = shock ? "flash" : tension >= 60 && phase === "plan" ? "high" : "off";
  const cine = phase === "reveal";
  return (
    <>
      <div aria-hidden className="war-fx war-vignette z-[7]" />
      <div aria-hidden className="war-fx war-scan z-[7]" />
      <div aria-hidden className="war-fx war-grain z-[7]" />
      <div aria-hidden className="war-fx war-alarm z-[8]" data-level={level} />
      <div aria-hidden className="war-lb top-0 z-[29]" data-on={cine} />
      <div aria-hidden className="war-lb bottom-0 z-[29]" data-on={cine} />
    </>
  );
}
