import { getUnVotes } from "@/lib/data/unvotes";

// GET /api/unvotes?iso3=IND
export async function GET(request: Request) {
  const iso3 = new URL(request.url).searchParams.get("iso3")?.toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(iso3)) return Response.json({ error: "iso3 must be a 3-letter code" }, { status: 400 });
  const body = await getUnVotes(iso3);
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
