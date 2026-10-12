import { fail, userFrom } from "@/lib/game/server/db";
import { answer, propose, resolve, saveOrders, setLock, view } from "@/lib/game/server/service";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

// GET /api/game/matches/:id — the match as this player may see it.
export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) return Response.json({ error: "Unknown match" }, { status: 404 });
    const user = await userFrom(request);
    if (!user) return Response.json({ error: "Sign in as a guest first." }, { status: 401 });
    return Response.json(await view(id, user.id), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/game/matches/:id — { op: "orders" | "lock" | "resolve" | "propose" | "answer", ... }
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) return Response.json({ error: "Unknown match" }, { status: 404 });
    const user = await userFrom(request);
    if (!user) return Response.json({ error: "Sign in as a guest first." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    switch (body.op) {
      case "orders":
        return Response.json(await saveOrders(id, user.id, body.orders));
      case "lock":
        return Response.json(await setLock(id, user.id, body.locked !== false));
      case "resolve":
        return Response.json(await resolve(id));
      case "propose":
        return Response.json(await propose(id, user.id, body as never));
      case "answer":
        return Response.json(await answer(id, user.id, String(body.id ?? ""), String(body.action ?? "")));
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return fail(e);
  }
}
