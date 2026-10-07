import "server-only";
import { cacheLife } from "next/cache";
import type { UnVotesSnapshot } from "@/ingest/jobs/unvotes";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

export type UnVotesRow = { year: number; agree: Record<string, number> } | null;

async function snapshot() {
  "use cache";
  cacheLife("hours");
  return readSnapshot<UnVotesSnapshot>("unvotes");
}

/** How often one country voted with every other in the latest UN General Assembly session. */
export async function getUnVotes(iso3: string): Promise<ApiEnvelope<UnVotesRow>> {
  const snap = await snapshot();
  const row = snap?.payload.agree[iso3];
  return {
    data: snap && row ? { year: snap.payload.year, agree: row } : null,
    asOf: snap?.asOf ?? null,
    stale: !snap || snap.origin === "seed",
    sources: ["UNGA voting data (Bailey, Strezhnev and Voeten, Harvard Dataverse)"],
  };
}
