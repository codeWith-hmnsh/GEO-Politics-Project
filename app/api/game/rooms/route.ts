import { configured, fail, userFrom } from "@/lib/game/server/db";
import { createRoom } from "@/lib/game/server/service";

// POST /api/game/rooms — create a private room (docs4.0/MULTIPLAYER.md §3). Body: { leader?, portrait?, scenario?, difficulty?, turnSeconds? }
export async function POST(request: Request) {
  try {
    if (!configured()) return Response.json({ error: "Multiplayer is not set up on this server." }, { status: 503 });
    const user = await userFrom(request);
    if (!user) return Response.json({ error: "Sign in as a guest first." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    return Response.json(await createRoom(user.id, body));
  } catch (e) {
    return fail(e);
  }
}
