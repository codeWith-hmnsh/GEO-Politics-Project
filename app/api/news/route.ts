import { after } from "next/server";
import { getNews } from "@/lib/data/news";
import { refreshNewsIfStale } from "@/lib/data/refresh";
import { SECTIONS, type Section } from "@/lib/schemas/news";

// GET /api/news?section=conflict&country=IND&limit=10&verified=1
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sectionParam = params.get("section") ?? "all";
  const section = (SECTIONS as readonly string[]).includes(sectionParam) ? (sectionParam as Section) : "all";
  const country = params.get("country")?.toUpperCase() || undefined;
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 30));
  const body = await getNews({ section, country, limit, verifiedOnly: params.get("verified") === "1" });
  // keep headlines fresh where no scheduled ingest is running (see refreshNewsIfStale)
  after(() => refreshNewsIfStale(body.asOf));
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
