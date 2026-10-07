import { connection } from "next/server";
import { getBrief } from "@/lib/data/brief";

// GET /api/brief: the Daily Brief (top 5 stories).
export async function GET() {
  await connection();
  const body = await getBrief();
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
