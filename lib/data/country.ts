import "server-only";
import { cacheLife } from "next/cache";
import type { Profile, ProfilesSnapshot, TradeRow, TradeSnapshot } from "@/ingest/jobs/country";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

export type CountryFacts = { profile: Profile | null; trade: TradeRow | null };

async function snapshots() {
  "use cache";
  cacheLife("hours");
  const [profiles, trade] = await Promise.all([readSnapshot<ProfilesSnapshot>("profiles"), readSnapshot<TradeSnapshot>("trade")]);
  return { profiles, trade };
}

/** Leaders, capital and top trade partners for one country. */
export async function getCountryFacts(iso3: string): Promise<ApiEnvelope<CountryFacts>> {
  const { profiles, trade } = await snapshots();
  const sources = [profiles && "Wikidata", trade && "UN Comtrade"].filter((s): s is string => !!s);
  return {
    data: { profile: profiles?.payload.profiles[iso3] ?? null, trade: trade?.payload.trade[iso3] ?? null },
    asOf: profiles?.asOf ?? trade?.asOf ?? null,
    stale: !profiles || profiles.origin === "seed",
    sources,
  };
}
