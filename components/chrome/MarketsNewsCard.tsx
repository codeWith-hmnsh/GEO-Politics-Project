"use client";

import { Newspaper, ShieldCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo, useNews } from "@/lib/api";
import type { NewsCluster } from "@/lib/schemas/news";
import { useGlobe } from "@/lib/store";

const INDICES = ["S&P 500", "Nikkei 225", "DAX", "BSE Sensex"];

export const SECTION_COLOR: Record<string, string> = {
  conflict: "#e5484d",
  summit: "#3f63d8",
  economy: "#e9a21c",
  defense: "#1b2f7a",
  energy: "#3fa765",
  diplomacy: "#c25a84",
};

function NewsRow({ c }: { c: NewsCluster }) {
  const fly = () => {
    if (c.lat !== null && c.lng !== null) useGlobe.getState().flyTo({ lat: c.lat, lng: c.lng, dist: 2.4 });
  };
  return (
    <li className="rounded-xl border border-border bg-white px-3 py-2.5">
      <a href={c.url} target="_blank" rel="noreferrer" onClick={fly} className="line-clamp-2 text-[13px] leading-snug font-semibold hover:underline">
        {c.title}
      </a>
      <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
        {c.sections[0] && <i className="size-2 rounded-sm" style={{ background: SECTION_COLOR[c.sections[0]] }} aria-hidden />}
        {c.source} · {timeAgo(c.publishedAt)}
        {c.sourceCount > 1 && <> · {c.sourceCount} sources</>}
        {c.verified && <ShieldCheck className="size-3.5 text-ally" aria-label="Reported by 2 or more trusted outlets" />}
      </span>
    </li>
  );
}

/** Bottom-right card: Markets (default) and News tabs (UI-DESIGN §8). */
export function MarketsNewsCard() {
  const panelOpen = useGlobe((s) => s.selectedIso3 !== null);
  const news = useNews({ limit: 8 });

  return (
    <section
      aria-label="Markets and news"
      className={`fixed right-[22px] bottom-[22px] z-20 w-[380px] rounded-2xl bg-[var(--glass)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl transition-opacity duration-300 max-[1100px]:hidden ${
        panelOpen ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <Tabs defaultValue="news">
        <TabsList className="mb-3">
          <TabsTrigger value="news">
            <Newspaper className="size-4" aria-hidden /> News
          </TabsTrigger>
          <TabsTrigger value="markets">
            <TrendingUp className="size-4" aria-hidden /> Markets today
          </TabsTrigger>
        </TabsList>
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
                  <NewsRow key={c.id} c={c} />
                ))}
              </ul>
              <p className="mt-2.5 text-[11.5px] text-ink-3">
                Trusted outlets only · updated {timeAgo(news.data.asOf)}
                {news.data.stale && " · showing saved headlines"}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-2">No verified headlines right now. We will try again in a few minutes.</p>
          )}
        </TabsContent>
        <TabsContent value="markets">
          <div className="grid grid-cols-4 gap-2.5">
            {INDICES.map((name) => (
              <div key={name}>
                <small className="block text-xs font-semibold whitespace-nowrap text-ink-2">{name}</small>
                <Skeleton className="mt-2 h-4 w-12" />
                <Skeleton className="mt-2 h-6 w-full" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-3">Market data needs a free data-provider key; it connects once added.</p>
        </TabsContent>
      </Tabs>
    </section>
  );
}
