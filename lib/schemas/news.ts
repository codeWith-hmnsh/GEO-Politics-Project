// Shared shapes for news between ingest and the app (docs/ARCHITECTURE.md §7).
import { z } from "zod";

export const SECTIONS = ["conflict", "summit", "economy", "defense", "energy", "diplomacy"] as const;
export const Section = z.enum(SECTIONS);
export type Section = z.infer<typeof Section>;

export const NewsSource = z.object({
  name: z.string(),
  domain: z.string(),
  tier: z.number().int().min(1).max(3),
  url: z.string().url(),
  title: z.string(),
  publishedAt: z.string(),
});
export type NewsSource = z.infer<typeof NewsSource>;

export const NewsCluster = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  publishedAt: z.string(),
  sections: z.array(Section),
  countries: z.array(z.string()),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  sourceCount: z.number().int(),
  /** Two or more independent Tier 1/2 outlets reported it (the 2-source rule). */
  verified: z.boolean(),
  sources: z.array(NewsSource),
});
export type NewsCluster = z.infer<typeof NewsCluster>;

export const NewsSnapshot = z.object({
  asOf: z.string(),
  clusters: z.array(NewsCluster),
  stats: z.object({ fetched: z.number(), kept: z.number(), feedsOk: z.number(), feedsFailed: z.number() }),
});
export type NewsSnapshot = z.infer<typeof NewsSnapshot>;

/** Envelope for every API response: data plus freshness (docs/ARCHITECTURE.md §2). */
export type ApiEnvelope<T> = { data: T; asOf: string | null; stale: boolean; sources: string[] };
