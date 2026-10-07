// Registry of DOM markers that follow points on the globe (UI-DESIGN §4.3–4.4).
// DOM components register their element; MarkerProjector (inside the canvas) positions them every frame.

export type MarkerEntry = {
  el: HTMLElement;
  /** Unit-sphere position. */
  v: [number, number, number];
  /** Hide when the camera is farther than this (Earth radii). */
  maxDist?: number;
  /** Hide when the camera is closer than this. */
  minDist?: number;
  /** Pixel offset from the projected point. */
  offset?: [number, number];
  /** Last written screen position (skip DOM writes when nothing moved). */
  last?: { x: number; y: number; o: number };
};

export const markerRegistry = new Map<string, MarkerEntry>();

/** Markers above this line would sit under the header and are hidden. */
export const HEADER_SAFE_Y = 78;
