// App state (docs/ARCHITECTURE.md §3.2). Grows milestone by milestone.
import { create } from "zustand";
import type { CameraState } from "@/lib/camera/fly";

export type FlyRequest = { lat: number; lng: number; dist?: number; durationMs?: number; id: number };

type GlobeState = {
  /** Live camera, written by the rig every frame (read with getState, do not subscribe). */
  camera: CameraState;
  hoverIso3: string | null;
  hoverName: string | null;
  pointer: { x: number; y: number };
  selectedIso3: string | null;
  fly: FlyRequest | null;
  introDone: boolean;
  setHover: (iso3: string | null, name: string | null, x: number, y: number) => void;
  select: (iso3: string | null) => void;
  flyTo: (req: Omit<FlyRequest, "id">) => void;
  finishIntro: () => void;
};

let flyId = 0;

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
  pointer: { x: 0, y: 0 },
  selectedIso3: null,
  fly: null,
  introDone: false,
  setHover: (iso3, name, x, y) => set({ hoverIso3: iso3, hoverName: name, pointer: { x, y } }),
  select: (iso3) => set({ selectedIso3: iso3 }),
  flyTo: (req) => set({ fly: { ...req, id: ++flyId } }),
  finishIntro: () => set({ introDone: true }),
}));
