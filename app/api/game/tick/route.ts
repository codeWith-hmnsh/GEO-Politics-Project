import { configured, fail } from "@/lib/game/server/db";
import { tick } from "@/lib/game/server/service";

// POST /api/game/tick — resolves overdue turns. Called every 30 s by pg_cron after deploy (MULTIPLAYER §4.1).
// Harmless if anyone calls it: only turns whose deadline has passed are resolved.
export async function POST() {
  try {
    if (!configured()) return Response.json({ resolved: 0 });
    return Response.json(await tick());
  } catch (e) {
    return fail(e);
  }
}
