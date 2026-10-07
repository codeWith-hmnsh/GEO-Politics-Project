"use client";

import { useGlobe } from "@/lib/store";

/** Clears the side cards and docks while a Story Tour plays, so the globe and captions have the stage. */
export function HideDuringTour({ children }: { children: React.ReactNode }) {
  const touring = useGlobe((s) => s.tour !== null);
  return touring ? null : <>{children}</>;
}
