import { connection } from "next/server";
import { getPulse } from "@/lib/data/pulse";

// GET /api/pulse — Home layers (conflicts, blocs, summits, borders, crises) joined with fresh news.
export async function GET() {
  await connection(); // always request-time: freshness matters more than prerendering
  const body = await getPulse();
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
