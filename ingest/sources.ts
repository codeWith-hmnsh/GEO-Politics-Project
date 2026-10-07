import sourcesConfig from "@/config/sources.json";

type TierInfo = { name: string; tier: number };
const tiers = sourcesConfig.tiers as Record<string, TierInfo>;
const blocked = new Set(sourcesConfig.blocked);

export type Feed = { url: string; domain: string; hint?: string };
export const FEEDS: Feed[] = sourcesConfig.feeds;

/** Registrable domain for lookups: "www.bbc.co.uk" → "bbc.co.uk", "edition.cnn.com" → "cnn.com". */
export function domainOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (tiers[host]) return host;
    const parts = host.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (tiers[candidate] || blocked.has(candidate)) return candidate;
    }
    return host;
  } catch {
    return null;
  }
}

/** Trusted outlet info, or null for blocked and unknown domains. */
export function trustOf(domain: string | null): (TierInfo & { domain: string }) | null {
  if (!domain || blocked.has(domain)) return null;
  const t = tiers[domain];
  return t ? { ...t, domain } : null;
}
