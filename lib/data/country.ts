import "server-only";
import { cacheLife } from "next/cache";
import type { CreditorRow, CreditorsSnapshot, CrudeRow, CrudeSnapshot, Profile, ProfilesSnapshot, TradeRow, TradeSnapshot } from "@/ingest/jobs/country";
import type { EnergySnapshot } from "@/ingest/jobs/energy";
import type { EnergyMix } from "@/lib/energy";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

export type CountryFacts = {
  profile: Profile | null;
  trade: TradeRow | null;
  creditors: CreditorRow | null;
  mix: EnergyMix | null;
  crude: CrudeRow | null;
};

async function snapshots() {
  "use cache";
  cacheLife("hours");
  const [profiles, trade, creditors, energy, crude] = await Promise.all([
    readSnapshot<ProfilesSnapshot>("profiles"),
    readSnapshot<TradeSnapshot>("trade"),
    readSnapshot<CreditorsSnapshot>("creditors"),
    readSnapshot<EnergySnapshot>("energy"),
    readSnapshot<CrudeSnapshot>("crude"),
  ]);
  return { profiles, trade, creditors, energy, crude };
}

/** Leaders, capital, top trade partners and largest lenders for one country. */
export async function getCountryFacts(iso3: string): Promise<ApiEnvelope<CountryFacts>> {
  const { profiles, trade, creditors, energy, crude } = await snapshots();
  const sources = [profiles && "Wikidata", trade && "UN Comtrade", creditors && "World Bank International Debt Statistics", energy && "Our World in Data"].filter((s): s is string => !!s);
  return {
    data: {
      profile: profiles?.payload.profiles[iso3] ?? null,
      trade: trade?.payload.trade[iso3] ?? null,
      creditors: creditors?.payload.creditors[iso3] ?? null,
      mix: energy?.payload.mix[iso3] ?? null,
      crude: crude?.payload.crude[iso3] ?? null,
    },
    asOf: profiles?.asOf ?? trade?.asOf ?? null,
    stale: !profiles || profiles.origin === "seed",
    sources,
  };
}
