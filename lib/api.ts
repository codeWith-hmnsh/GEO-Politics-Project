"use client";

import { useQuery } from "@tanstack/react-query";
import type { BriefItem } from "@/lib/brief";
import type { CountryFacts } from "@/lib/data/country";
import type { Pulse } from "@/lib/data/pulse";
import type { IndicatorsSnapshot } from "@/ingest/jobs/indicators";
import type { ApiEnvelope, NewsCluster, Section } from "@/lib/schemas/news";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useNews(params: { section?: Section | "all"; country?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.section && params.section !== "all") qs.set("section", params.section);
  if (params.country) qs.set("country", params.country);
  if (params.limit) qs.set("limit", String(params.limit));
  return useQuery({
    queryKey: ["news", params.section ?? "all", params.country ?? "", params.limit ?? 30],
    queryFn: () => getJson<ApiEnvelope<NewsCluster[]>>(`/api/news?${qs}`),
    refetchInterval: 5 * 60_000,
  });
}

export function useIndicators(mode: string) {
  const enabled = mode === "economy" || mode === "defense" || mode === "energy";
  return useQuery({
    queryKey: ["indicators", mode],
    queryFn: () => getJson<ApiEnvelope<IndicatorsSnapshot["metrics"]>>(`/api/indicators?mode=${mode}`),
    enabled,
    staleTime: 60 * 60_000,
  });
}

export function useCountryFacts(iso3: string | null) {
  return useQuery({
    queryKey: ["country", iso3],
    queryFn: () => getJson<ApiEnvelope<CountryFacts>>(`/api/country?iso3=${iso3}`),
    enabled: !!iso3,
    staleTime: 60 * 60_000,
  });
}

export function useBrief() {
  return useQuery({
    queryKey: ["brief"],
    queryFn: () => getJson<ApiEnvelope<BriefItem[]>>("/api/brief"),
    refetchInterval: 15 * 60_000,
  });
}

export function usePulse() {
  return useQuery({
    queryKey: ["pulse"],
    queryFn: () => getJson<ApiEnvelope<Pulse>>("/api/pulse"),
    refetchInterval: 5 * 60_000,
  });
}

/** "12 min ago", "3 h ago", "2 d ago". */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "unknown";
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
