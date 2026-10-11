// Camera moves for /play. On phones the decision sheet covers the lower half of the screen,
// so the camera pulls back and aims below the target to keep it in the visible top part.
import { useGlobe } from "@/lib/store";

export function focus(lat: number, lng: number, dist: number, durationMs = 1200) {
  const phone = typeof window !== "undefined" && window.innerWidth < 768;
  useGlobe.getState().flyTo(phone ? { lat: lat - 16, lng, dist: dist * 1.9, durationMs } : { lat, lng, dist, durationMs });
}
