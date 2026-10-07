// Story Tours (docs/CONTENT-GUIDE.md §5): authored, 60–120 s guided explainers.
import blocs from "@/data/tours/blocs.json";
import hormuz from "@/data/tours/hormuz.json";
import indiaBorders from "@/data/tours/india-borders.json";
import israelGaza from "@/data/tours/israel-gaza.json";
import russiaUkraine from "@/data/tours/russia-ukraine.json";
import southChinaSea from "@/data/tours/south-china-sea.json";
import type { Section } from "@/lib/schemas/news";

export type TourStop = {
  /** `altitude` is height above the surface in Earth radii (camera distance = 1 + altitude). */
  camera: { lat: number; lng: number; altitude: number };
  orbit_deg: number;
  highlight?: string[];
  /** Light up a bloc's members instead of a fixed list. */
  highlight_org?: string;
  caption_title: string;
  caption: string;
};

export type Tour = {
  id: string;
  title: string;
  summary: string;
  duration_s: number;
  reviewed: string;
  needsEditorialReview: boolean;
  /** Conflict card that offers "Watch Story". */
  conflict?: string;
  sources: string[];
  stops: TourStop[];
  live_query: { section: Section | "all"; terms: string[] };
};

export const TOURS = [russiaUkraine, israelGaza, indiaBorders, hormuz, blocs, southChinaSea] as Tour[];
export const tourById = (id: string) => TOURS.find((t) => t.id === id);
export const tourForConflict = (conflictId: string) => TOURS.find((t) => t.conflict === conflictId);

/** Seconds a caption stays up: reading time plus the camera move, kept within 8–15 s. */
export function stopSeconds(caption: string) {
  return Math.min(15, Math.max(8, Math.round(caption.split(/\s+/).length / 2.6 + 4)));
}

/** Headlines for the final "What's happening now" stop: title contains any of the tour's terms. */
export function matchesTour<T extends { title: string }>(items: T[], terms: string[]) {
  const re = new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i");
  return items.filter((i) => re.test(i.title));
}
