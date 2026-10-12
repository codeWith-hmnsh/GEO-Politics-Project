// Server-side Supabase access for Statecraft (docs4.0/MULTIPLAYER.md §5–§8). Never import from client code.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function configured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Admin client with the secret key: bypasses RLS, so every route must check the caller itself. */
export function db(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** The signed-in (guest or real) user behind a request's bearer token, or null. */
export async function userFrom(request: Request): Promise<{ id: string } | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

/** Small "something changed" notice on the match channel. Never the state itself (clients refetch). */
export async function notify(matchId: string, event: string, payload: Record<string, unknown> = {}) {
  const url = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers: Record<string, string> = { "content-type": "application/json", apikey: key };
  if (!key.startsWith("sb_")) headers.authorization = `Bearer ${key}`;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: [{ topic: `match:${matchId}`, event, payload: { ...payload, at: Date.now() } }] }),
    });
  } catch {
    // clients also poll, so a lost notice only delays an update
  }
}

export class GameError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function fail(e: unknown) {
  if (e instanceof GameError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Something went wrong on the server. Try again." }, { status: 500 });
}
