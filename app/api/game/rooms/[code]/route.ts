import { fail, userFrom } from "@/lib/game/server/db";
import { joinRoom, lobbyAction } from "@/lib/game/server/service";

// POST /api/game/rooms/:code — { op: "join" | "seat" | "profile" | "settings" | "leave" | "start", ... }
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!/^[A-Z2-9]{5}$/i.test(code)) return Response.json({ error: "A room code has 5 letters or numbers." }, { status: 400 });
    const user = await userFrom(request);
    if (!user) return Response.json({ error: "Sign in as a guest first." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.op === "join") return Response.json(await joinRoom(code, user.id, body.leader as string, body.portrait as number));
    return Response.json(await lobbyAction(code, user.id, String(body.op ?? ""), body));
  } catch (e) {
    return fail(e);
  }
}
