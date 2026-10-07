import "server-only";
import { cacheLife } from "next/cache";
import type { CreditorRow, CreditorsSnapshot, Profile, ProfilesSnapshot, TradeRow, TradeSnapshot } from "@/ingest/jobs/country";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

export type CountryFacts = { profile: Profile | null; trade: TradeRow | null; creditors: CreditorRow | null };

async function snapshots() {
  "use cache";
  cacheLife("hours");
  const [profiles, trade, creditors] = await Promise.all([
    readSnapshot<ProfilesSnapshot>("profiles"),
    readSnapshot<TradeSnapshot>("trade"),
    readSnapshot<CreditorsSnapshot>("creditors"),
  ]);
  return { profiles, trade, creditors };
}

/** Leaders, capital, top trade partners and largest lenders for one country. */
export async function getCountryFacts(iso3: string): Promise<ApiEnvelope<CountryFacts>> {
  const { profiles, trade, creditors } = await snapshots();
  const sources = [profiles && "Wikidata", trade && "UN Comtrade", creditors && "World Bank International Debt Statistics"].filter((s): s is string => !!s);
  return {
    data: {
      profile: profiles?.payload.profiles[iso3] ?? null,
      trade: trade?.payload.trade[iso3] ?? null,
      creditors: creditors?.payload.creditors[iso3] ?? null,
    },
    asOf: profiles?.asOf ?? trade?.asOf ?? null,
    stale: !profiles || profiles.origin === "seed",
    sources,
  };
}
