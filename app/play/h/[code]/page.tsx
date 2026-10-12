import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShareCard } from "@/components/game/ShareCard";
import { SCENARIO_NAME, decodeShare } from "@/lib/game/share";
import { NAMES } from "@/lib/game/text";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = decodeShare((await params).code);
  if (!s) return { title: "Statecraft · GeoPolitics" };
  const title = `${s.l} led ${NAMES[s.c]} ${s.y0}–${s.y1} · Statecraft`;
  const description = `Power rank #${s.r0} → #${s.r1}, Leader Score ${s.s}${s.w ? ", winner" : ""}. “${s.a}”`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Public share page for a finished match (BUILD-PLAN S4). Results are not server-verified yet.
export default function SharePage({ params }: Props) {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-paper px-4 py-12"
      style={{
        background:
          "radial-gradient(60% 50% at 50% 30%, #dfe9ee 0%, #f3f1ec 70%)",
      }}
    >
      <Suspense
        fallback={
          <div className="h-[520px] w-[min(520px,100%)] animate-pulse rounded-[18px] bg-white/60" />
        }
      >
        <Shared params={params} />
      </Suspense>
    </main>
  );
}

async function Shared({ params }: Props) {
  const s = decodeShare((await params).code);
  if (!s) notFound();
  return (
    <div className="grid w-[min(520px,100%)] gap-6">
      <div className="text-[11px] font-extrabold tracking-[.14em] text-ink-3 uppercase">
        Statecraft · {SCENARIO_NAME[s.sc]} · shared result
      </div>
      <ShareCard s={s} />
      <div className="grid gap-3">
        <h1 className="font-display text-[34px] leading-tight font-semibold">
          Could you do better with {NAMES[s.c]}?
        </h1>
        <p className="text-[15px] text-ink-2">
          Lead a real country for twelve years. Budget, build, trade and
          negotiate on a living globe. About 20 minutes, free, no download.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href={`/play/match?country=${s.c}`}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink-strong)] px-5 text-[14.5px] font-bold text-white"
          >
            Lead {NAMES[s.c]}
          </Link>
          <Link
            href="/play"
            className="inline-flex min-h-11 items-center rounded-full border border-[rgba(17,35,43,.16)] bg-white/80 px-5 text-[14.5px] font-bold"
          >
            How Statecraft works
          </Link>
        </div>
        <p className="text-[12px] text-ink-3">
          Simulated match. Shared results are not verified yet.
        </p>
      </div>
    </div>
  );
}
