"use client";

import { ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { Flag } from "@/components/chrome/Flag";
import { timeAgo, useBrief } from "@/lib/api";
import { track } from "@/lib/analytics";
import { useGlobe } from "@/lib/store";

const kicker = "mb-1.5 text-[11px] font-bold tracking-[.16em] text-ink-3 uppercase";

/** Daily Brief: the top 5 stories of the day; tapping one flies the globe there (PRD §6, FR-H-11). */
export function BriefPanel({ countryName }: { countryName: (iso3: string) => string }) {
  const { data, isPending } = useBrief();
  const items = data?.data ?? [];
  const go = (i: number) => {
    const c = items[i];
    if (c.lat === null || c.lng === null) return;
    track("brief_click", { rank: i + 1, section: c.sections[0] ?? "none" });
    useGlobe.getState().flyTo({ lat: c.lat, lng: c.lng, dist: 2.2 });
  };
  return (
    <>
      <div className={kicker}>Daily Brief</div>
      <h2 className="mr-11 text-[26px] leading-tight font-bold tracking-tight">Today&apos;s top stories</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        Ranked by how many trusted outlets in different regions report them. Updated {timeAgo(data?.asOf)}.
      </p>
      {isPending ? (
        <p className="mt-6 text-sm text-ink-2">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-2">No major stories from trusted outlets in the last 48 hours.</p>
      ) : (
        <ol className="mt-4 grid gap-2.5">
          {items.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.06 * i, duration: 0.3 }}
              className="rounded-2xl bg-paper"
            >
              <button type="button" onClick={() => go(i)} className="grid w-full grid-cols-[28px_1fr] gap-x-2.5 p-3.5 text-left">
                <span className="font-display text-2xl leading-none font-semibold text-ink-3 tabular-nums">{i + 1}</span>
                <span>
                  <b className="block text-[14.5px] leading-snug font-semibold">{c.title}</b>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    {c.countries[0] && (
                      <span className="flex items-center gap-1 font-semibold text-ink-2">
                        <Flag iso3={c.countries[0]} className="h-[10px] w-[15px]" />
                        {countryName(c.countries[0])}
                      </span>
                    )}
                    <span>{timeAgo(c.publishedAt)}</span>
                    <span>
                      {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"} · {c.regions.length} {c.regions.length === 1 ? "region" : "regions"}
                    </span>
                    {c.verified && (
                      <span className="flex items-center gap-1 text-ally">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        Verified
                      </span>
                    )}
                    {c.pinned && <span className="font-semibold text-ink-2">Editor&apos;s pick</span>}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-ink-2">
                    <MapPin className="size-3.5" aria-hidden />
                    Show on globe
                  </span>
                </span>
              </button>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="mx-3.5 mb-3 ml-[52px] flex items-center gap-1 text-xs font-semibold text-ink-2 hover:underline"
              >
                Read at {c.source}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </motion.li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        Verified means two or more independent trusted outlets reported it. We show headlines and links only.
      </p>
    </>
  );
}
