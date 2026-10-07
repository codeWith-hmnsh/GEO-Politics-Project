import { getModeIndicators } from "@/lib/data/indicators";

// GET /api/indicators?mode=economy|defense
export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode !== "economy" && mode !== "defense") {
    return Response.json({ error: "mode must be economy or defense" }, { status: 400 });
  }
  const body = await getModeIndicators(mode);
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
