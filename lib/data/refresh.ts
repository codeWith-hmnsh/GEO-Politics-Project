import "server-only";
import { runNews } from "@/ingest/jobs/news";

// The scheduled ingest runs every 15 minutes; give it a margin before the server steps in.
const STALE_MS = 20 * 60_000;
const RETRY_MS = 5 * 60_000;

let running: Promise<void> | null = null;
let lastTry = 0;

/**
 * Headlines must not go stale just because the scheduled ingest (GitHub Actions) is not running, for example
 * when its secrets are missing or on a local server. When the newest snapshot is older than the schedule
 * allows, the server runs the news ingest itself: at most one run at a time, retried no more than every
 * 5 minutes. It writes wherever ingest writes (Supabase, else data/live).
 */
export function refreshNewsIfStale(asOf: string | null): Promise<void> | undefined {
  // without Supabase, Vercel has nowhere to write (read-only file system)
  if (process.env.VERCEL && !process.env.SUPABASE_URL) return;
  if (asOf && Date.now() - Date.parse(asOf) < STALE_MS) return;
  if (running) return running;
  if (Date.now() - lastTry < RETRY_MS) return;
  lastTry = Date.now();
  running = runNews({ log: () => {} })
    .then(() => undefined)
    .catch((e) => console.error("news refresh failed:", e))
    .finally(() => {
      running = null;
    });
  return running ?? undefined;
}
