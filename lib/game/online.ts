// Browser side of multiplayer (docs4.0/MULTIPLAYER.md §6–§8): guest sign-in, API calls with the user's token,
// and Realtime notices that tell the page to refetch. Uses only the publishable key.
"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const onlineAvailable = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

function sb(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Multiplayer is not set up (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "statecraft-auth" } });
  return client;
}

let signingIn: Promise<string> | null = null;

/** A guest account is created on first use and kept in this browser (F-6: no login needed to play). */
export async function ensureSession(): Promise<string> {
  const auth = sb().auth;
  const { data } = await auth.getSession();
  if (data.session) return data.session.access_token;
  // one sign-in at a time, or two calls at once would create two different guests
  signingIn ??= auth
    .signInAnonymously()
    .then(({ data: signed, error }) => {
      if (error || !signed.session) throw new Error(error?.message ?? "Could not start a guest session.");
      return signed.session.access_token;
    })
    .finally(() => {
      signingIn = null;
    });
  return signingIn;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const token = await ensureSession();
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status);
  return json;
}

/** Listen for "something changed" notices on a match. Returns an unsubscribe function. */
export function subscribeMatch(matchId: string, onEvent: (event: string, payload: Record<string, unknown>) => void): () => void {
  let channel: RealtimeChannel | null = null;
  try {
    channel = sb()
      .channel(`match:${matchId}`)
      .on("broadcast", { event: "*" }, (msg) => onEvent(msg.event, (msg.payload ?? {}) as Record<string, unknown>))
      .subscribe();
  } catch {
    // polling still keeps the page up to date
  }
  return () => {
    if (channel) void sb().removeChannel(channel);
  };
}

/** Leader name and portrait remembered in this browser for the next room. */
export function savedProfile(): { leader: string; portrait: number } {
  try {
    const p = JSON.parse(localStorage.getItem("statecraft-profile") ?? "{}");
    return { leader: typeof p.leader === "string" ? p.leader : "", portrait: Number.isInteger(p.portrait) ? p.portrait : 0 };
  } catch {
    return { leader: "", portrait: 0 };
  }
}

export function saveProfile(p: { leader: string; portrait: number }) {
  try {
    localStorage.setItem("statecraft-profile", JSON.stringify(p));
  } catch {
    // optional
  }
}

/** Create a private room and return its 5-character code. */
export async function createRoom(): Promise<string> {
  const p = savedProfile();
  const res = await api<{ code: string }>("/api/game/rooms", { leader: p.leader, portrait: p.portrait });
  return res.code;
}
