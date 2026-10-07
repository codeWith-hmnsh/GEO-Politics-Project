"use client";

import { track as vercelTrack } from "@vercel/analytics";

/** Product events (BUILD-PLAN M3): anonymous and cookieless, no personal data (PRD §10 Privacy). */
export type EventName = "brief_click" | "tour_start" | "tour_step" | "tour_complete";

export function track(name: EventName, props: Record<string, string | number | boolean> = {}) {
  try {
    vercelTrack(name, props);
  } catch {
    // Analytics must never break the page.
  }
}
