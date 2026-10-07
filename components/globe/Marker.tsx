"use client";

import { useEffect, useId, useRef } from "react";
import { markerRegistry } from "@/lib/markers";
import { latLngToVec3 } from "@/lib/geo/sphere";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lng: number;
  maxDist?: number;
  minDist?: number;
  offset?: [number, number];
  className?: string;
  children: React.ReactNode;
};

/** A DOM element pinned to a point on the globe; positioned by MarkerProjector. */
export function Marker({ lat, lng, maxDist, minDist, offset, className, children }: Props) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    markerRegistry.set(id, { el, v: latLngToVec3(lat, lng, 1), maxDist, minDist, offset });
    return () => {
      markerRegistry.delete(id);
    };
  }, [id, lat, lng, maxDist, minDist, offset]);

  return (
    <div
      ref={ref}
      className={cn("pointer-events-none absolute left-0 top-0 transition-opacity duration-300", className)}
      style={{ opacity: 0, visibility: "hidden" }}
    >
      {children}
    </div>
  );
}
