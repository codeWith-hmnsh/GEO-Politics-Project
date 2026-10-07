"use client";

import { Newspaper, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobe } from "@/lib/store";

const INDICES = ["S&P 500", "Nikkei 225", "DAX", "BSE Sensex"];

/** Bottom-right card: Markets (default) and News tabs. Live data lands in M1.3. */
export function MarketsNewsCard() {
  const panelOpen = useGlobe((s) => s.selectedIso3 !== null);
  return (
    <section
      aria-label="Markets and news"
      className={`fixed right-[22px] bottom-[22px] z-20 w-[380px] rounded-2xl bg-[var(--glass)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl transition-opacity duration-300 max-[1100px]:hidden ${
        panelOpen ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <Tabs defaultValue="markets">
        <TabsList className="mb-3">
          <TabsTrigger value="markets">
            <TrendingUp className="size-4" aria-hidden /> Markets today
          </TabsTrigger>
          <TabsTrigger value="news">
            <Newspaper className="size-4" aria-hidden /> News
          </TabsTrigger>
        </TabsList>
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
          <p className="mt-3 text-xs text-ink-3">Market data connects in the next step.</p>
        </TabsContent>
        <TabsContent value="news">
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-3">Verified headlines connect in the next step.</p>
        </TabsContent>
      </Tabs>
    </section>
  );
}
