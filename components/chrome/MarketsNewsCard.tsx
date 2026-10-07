"use client";

import { ExternalLink, Newspaper, ShieldCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { flags } from "@/config/flags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo, useNews, usePulse } from "@/lib/api";
import type { PulseConflict } from "@/lib/data/pulse";
import type { NewsCluster } from "@/lib/schemas/news";
import { panelOpenSelector, useGlobe } from "@/lib/store";

const INDICES = ["S&P 500", "Nikkei 225", "DAX", "BSE Sensex"];

export const SECTION_COLOR: Record<string, string> = {
  conflict: "#e5484d",
  summit: "#3f63d8",
  economy: "#e9a21c",
  defense: "#1b2f7a",
  energy: "#3fa765",
  diplomacy: "#c25a84",
};

/** Tap a headline: fly to its place and open the matching conflict card, or the lead country's panel (UI-DESIGN §8). */
function openStory(c: NewsCluster, conflicts: PulseConflict[]) {
  const g = useGlobe.getState();
  const conflict = conflicts.find((k) => k.news.some((n) => n.id === c.id));
  if (conflict) {
    g.selectConflict(conflict.id);
    g.flyTo({ lat: conflict.at[0], lng: conflict.at[1], dist: 2.2 });
    return;
  }
  if (c.countries[0]) g.select(c.countries[0]);
  if (c.lat !== null && c.lng !== null)
    g.flyTo({ lat: c.lat, lng: c.lng, dist: 2.4 });
}

function NewsRow({
  c,
  conflicts,
}: {
  c: NewsCluster;
  conflicts: PulseConflict[];
}) {
  const placed = c.lat !== null || c.countries.length > 0;
  return (
    <li className="rounded-xl border border-border bg-white px-3 py-2.5">
      {placed ? (
        <button
          type="button"
          onClick={() => openStory(c, conflicts)}
          className="line-clamp-2 text-left text-[13px] leading-snug font-semibold hover:underline"
        >
          {c.title}
        </button>
      ) : (
        <span className="line-clamp-2 text-[13px] leading-snug font-semibold">
          {c.title}
        </span>
      )}
      <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
        {c.sections[0] && (
          <i
            className="size-2 rounded-sm"
            style={{ background: SECTION_COLOR[c.sections[0]] }}
            aria-hidden
          />
        )}
        {c.source} · {timeAgo(c.publishedAt)}
        {c.sourceCount > 1 && <> · {c.sourceCount} sources</>}
        {c.verified && (
          <ShieldCheck
            className="size-3.5 text-ally"
            aria-label="Reported by 2 or more trusted outlets"
          />
        )}
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-0.5 font-semibold text-ink-2 hover:underline"
        >
          Read
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only"> at {c.source}</span>
        </a>
      </span>
    </li>
  );
}

/** Bottom-right card: Markets (default) and News tabs (UI-DESIGN §8). */
export function MarketsNewsCard() {
  const panelOpen = useGlobe(panelOpenSelector);
  const news = useNews({ limit: 8 });
  const { data: pulse } = usePulse();
  const conflicts = pulse?.data.conflicts ?? [];

  return (
    <section
      aria-label="Markets and news"
      className={`fixed right-[22px] bottom-[22px] z-20 w-[380px] rounded-2xl bg-[var(--glass)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl transition-opacity duration-300 max-[1100px]:hidden ${
        panelOpen ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <Tabs defaultValue="news">
        {/* Until a market-data key exists, the card shows news only instead of an empty Markets tab. */}
        {flags.markets ? (
          <TabsList className="mb-3">
            <TabsTrigger
              value="news"
              className="text-ink-2 data-active:text-ink"
            >
              <Newspaper className="size-4" aria-hidden /> News
            </TabsTrigger>
            <TabsTrigger
              value="markets"
              className="text-ink-2 data-active:text-ink"
            >
              <TrendingUp className="size-4" aria-hidden /> Markets today
            </TabsTrigger>
          </TabsList>
        ) : (
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Newspaper className="size-4" aria-hidden /> Latest news
          </h2>
        )}
        <TabsContent value="news">
          {news.isPending ? (
            <div className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : news.data && news.data.data.length > 0 ? (
            <>
              <ul className="grid max-h-[200px] gap-2 overflow-auto pr-1">
                {news.data.data.map((c) => (
                  <NewsRow key={c.id} c={c} conflicts={conflicts} />
                ))}
              </ul>
              <p className="mt-2.5 text-[11.5px] text-ink-3">
                Trusted outlets only · updated {timeAgo(news.data.asOf)}
                {news.data.stale && " · showing saved headlines"}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-2">
              No verified headlines right now. We will try again in a few
              minutes.
            </p>
          )}
        </TabsContent>
        {flags.markets && (
          <TabsContent value="markets">
            <div className="grid grid-cols-4 gap-2.5">
              {INDICES.map((name) => (
                <div key={name}>
                  <small className="block text-xs font-semibold whitespace-nowrap text-ink-2">
                    {name}
                  </small>
                  <Skeleton className="mt-2 h-4 w-12" />
                  <Skeleton className="mt-2 h-6 w-full" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Market data needs a free data-provider key; it connects once
              added.
            </p>
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
