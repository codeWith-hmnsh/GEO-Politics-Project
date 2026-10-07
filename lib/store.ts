// App state (docs/ARCHITECTURE.md §3.2). Grows milestone by milestone.
import { create } from "zustand";
import type { CameraState } from "@/lib/camera/fly";
import type { MetricId } from "@/lib/metrics";

export type FlyRequest = { lat: number; lng: number; dist?: number; durationMs?: number; id: number };
export type ZoomRequest = { factor: number; id: number };
export type Mode = "home" | "economy" | "defense" | "energy" | "diplomacy";
export type LayerId = "wars" | "orgs" | "econ" | "rel";
export type AdminLabel = { name: string; label: [number, number] };

type GlobeState = {
  /** Live camera, written by the rig every frame (read with getState, do not subscribe). */
  camera: CameraState;
  hoverIso3: string | null;
  hoverName: string | null;
  hoverLatLng: [number, number] | null;
  pointer: { x: number; y: number };
  selectedIso3: string | null;
  /** Second country in Compare (Economy / Defense). */
  compareIso3: string | null;
  /** Waiting for the user to tap the second country. */
  comparePicking: boolean;
  startCompare: () => void;
  selectedConflict: string | null;
  selectedOrg: string | null;
  selectedSummit: string | null;
  /** Learn panels opened from the header: Daily Brief or the Stories list. */
  sidePanel: "brief" | "stories" | null;
  openSide: (panel: "brief" | "stories") => void;
  /** Countries lit by a glossary "See on globe" (cleared by any selection). */
  highlight: string[];
  setHighlight: (iso3s: string[]) => void;
  fly: FlyRequest | null;
  zoom: ZoomRequest | null;
  introDone: boolean;
  mode: Mode;
  layers: Record<LayerId, boolean>;
  pulseOpen: boolean;
  adminLabels: Record<string, AdminLabel[]>;
  modeMetric: { economy: MetricId; defense: MetricId };
  setModeMetric: (mode: "economy" | "defense", id: MetricId) => void;
  setHover: (iso3: string | null, name: string | null, x: number, y: number, latLng?: [number, number] | null) => void;
  select: (iso3: string | null) => void;
  selectConflict: (id: string | null) => void;
  selectOrg: (id: string | null) => void;
  selectSummit: (id: string | null) => void;
  closePanel: () => void;
  flyTo: (req: Omit<FlyRequest, "id">) => void;
  zoomBy: (factor: number) => void;
  finishIntro: () => void;
  setMode: (mode: Mode) => void;
  toggleLayer: (id: LayerId) => void;
  setPulseOpen: (open: boolean) => void;
  addAdminLabels: (iso3: string, labels: AdminLabel[]) => void;
};

let requestId = 0;

const NONE = { selectedIso3: null, selectedConflict: null, selectedOrg: null, selectedSummit: null, highlight: [] as string[], compareIso3: null, comparePicking: false, sidePanel: null };

/** True when any detail panel is open. */
export const panelOpenSelector = (s: {
  selectedIso3: string | null;
  selectedConflict: string | null;
  selectedOrg: string | null;
  selectedSummit: string | null;
  sidePanel: string | null;
}) =>
  s.selectedIso3 !== null || s.selectedConflict !== null || s.selectedOrg !== null || s.selectedSummit !== null || s.sidePanel !== null;

export const HOME_VIEW: CameraState = { lat: 25, lng: 70, dist: 3.05 };

/** Home view for the current screen: portrait phones need the camera farther out to fit the globe. */
export function homeView(): CameraState {
  if (typeof window === "undefined") return HOME_VIEW;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  return { ...HOME_VIEW, dist: aspect < 0.8 ? 5.2 : aspect < 1.2 ? 3.9 : HOME_VIEW.dist };
}

export const useGlobe = create<GlobeState>((set) => ({
  camera: { ...HOME_VIEW },
  hoverIso3: null,
  hoverName: null,
  hoverLatLng: null,
  pointer: { x: 0, y: 0 },
  selectedIso3: null,
  compareIso3: null,
  comparePicking: false,
  selectedConflict: null,
  selectedOrg: null,
  selectedSummit: null,
  sidePanel: null,
  highlight: [],
  fly: null,
  zoom: null,
  introDone: false,
  mode: "home",
  layers: { wars: true, orgs: true, econ: true, rel: true },
  pulseOpen: true,
  adminLabels: {},
  modeMetric: { economy: "growth", defense: "milPct" },
  setModeMetric: (mode, id) => set((s) => ({ modeMetric: { ...s.modeMetric, [mode]: id } })),
  setHover: (iso3, name, x, y, latLng = null) => set({ hoverIso3: iso3, hoverName: name, pointer: { x, y }, hoverLatLng: latLng }),
  // One panel at a time: each selection clears the others.
  setHighlight: (iso3s) => set({ ...NONE, highlight: iso3s }),
  // While picking a Compare partner, a tap on another country fills the second slot instead.
  select: (iso3) =>
    set((s) =>
      s.comparePicking && s.selectedIso3 && iso3 && iso3 !== s.selectedIso3
        ? { compareIso3: iso3, comparePicking: false }
        : { ...NONE, selectedIso3: iso3 },
    ),
  openSide: (panel) => set({ ...NONE, sidePanel: panel }),
  startCompare: () => set({ comparePicking: true, compareIso3: null }),
  selectConflict: (id) => set({ ...NONE, selectedConflict: id }),
  selectOrg: (id) => set({ ...NONE, selectedOrg: id }),
  selectSummit: (id) => set({ ...NONE, selectedSummit: id }),
  closePanel: () => set(NONE),
  flyTo: (req) => set({ fly: { ...req, id: ++requestId } }),
  zoomBy: (factor) => set({ zoom: { factor, id: ++requestId } }),
  finishIntro: () => set({ introDone: true }),
  setMode: (mode) => set((s) => ({ mode: s.mode === mode && mode !== "home" ? "home" : mode })),
  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  setPulseOpen: (open) => set({ pulseOpen: open }),
  addAdminLabels: (iso3, labels) => set((s) => ({ adminLabels: { ...s.adminLabels, [iso3]: labels } })),
}));
