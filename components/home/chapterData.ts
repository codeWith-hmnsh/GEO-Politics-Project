import type { DiploView } from "@/lib/diplomacy";
import type { MetricId } from "@/lib/metrics";
import type { Mode } from "@/lib/store";

/** Home scroll story: each chapter sets the globe's lens and flies the camera. */
export type Chapter = {
  id: string;
  name: string;
  tint: string;
  mode: Mode;
  cam: { lat: number; lng: number; dist: number };
  /** Slow drift while the chapter is on screen, degrees of longitude per second. */
  orbit: number;
  metric?: MetricId;
  diplo?: { view: DiploView; bloc: string };
};

export const CHAPTERS: Chapter[] = [
  { id: "conflict", name: "Conflict", tint: "#e5484d", mode: "home", cam: { lat: 38, lng: 36, dist: 2.45 }, orbit: 0.8 },
  { id: "money", name: "Money", tint: "#e8a21c", mode: "economy", cam: { lat: 22, lng: 25, dist: 3.15 }, orbit: 2.2, metric: "growth" },
  { id: "energy", name: "Energy", tint: "#2fa36b", mode: "energy", cam: { lat: 25, lng: 54, dist: 2.35 }, orbit: 0.6, metric: "imports" },
  { id: "force", name: "Force", tint: "#4c74d9", mode: "defense", cam: { lat: 42, lng: 75, dist: 3.1 }, orbit: 1.6, metric: "nuclear" },
  { id: "alliances", name: "Alliances", tint: "#a07cf0", mode: "diplomacy", cam: { lat: 52, lng: 0, dist: 3.2 }, orbit: 1.2, diplo: { view: "blocs", bloc: "NATO" } },
];

/** Scroll index of the Story Tours section, right after the chapters; the opaque cover follows it. */
export const STORIES_AT = CHAPTERS.length;
