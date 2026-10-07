import type { Metadata } from "next";
import Link from "next/link";
import sources from "@/config/sources.json";

export const metadata: Metadata = { title: "Sources · GeoPolitics", description: "Where every number and headline comes from." };

const DATASETS: { area: string; items: { name: string; use: string; licence: string; url: string }[] }[] = [
  {
    area: "News",
    items: [
      { name: "Trusted outlet RSS feeds", use: "Headlines and links only; never article text", licence: "Each outlet's terms; we show headline, source and link", url: "#outlets" },
      { name: "GDELT Project", use: "Extra coverage when available", licence: "Free and open", url: "https://www.gdeltproject.org/" },
    ],
  },
  {
    area: "Map and globe",
    items: [
      { name: "Natural Earth (admin-0, admin-1)", use: "Country and state boundaries", licence: "Public domain", url: "https://www.naturalearthdata.com/" },
      { name: "NASA Blue Marble and Black Marble", use: "Satellite surface and city lights", licence: "Public domain (NASA)", url: "https://visibleearth.nasa.gov/" },
      { name: "Cloud cover texture", use: "Cloud layers", licence: "Under review before public launch", url: "https://github.com/vasturiano/three-globe" },
    ],
  },
  {
    area: "Curated data",
    items: [
      { name: "Conflicts, blocs, summits, borders, crises, relations", use: "Home layers", licence: "GeoPolitics editorial (draft, under review)", url: "https://github.com/" },
    ],
  },
];

const tierName = ["", "Tier 1 — wires and public broadcasters", "Tier 2 — major newspapers and networks", "Tier 3"];

export default function SourcesPage() {
  const outlets = Object.entries(sources.tiers as Record<string, { name: string; tier: number }>);
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-ink">
      <Link href="/" className="text-sm font-semibold text-ink-2 hover:text-ink">
        ← Back to the globe
      </Link>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance">Where every number comes from</h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        GeoPolitics shows headlines only from trusted outlets and marks an event as verified when two or more of them report it. Every
        value shows its source and an &ldquo;as of&rdquo; time. Curated files are drafts until an editor reviews them.
      </p>
      {DATASETS.map((group) => (
        <section key={group.area} className="mt-10">
          <h2 className="text-xs font-bold tracking-[.16em] text-ink-3 uppercase">{group.area}</h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white">
            {group.items.map((d) => (
              <li key={d.name} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto]">
                <a href={d.url} className="font-semibold hover:underline">
                  {d.name}
                </a>
                <span className="text-sm text-ink-3 sm:text-right">{d.licence}</span>
                <span className="text-sm text-ink-2 sm:col-span-2">{d.use}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section id="outlets" className="mt-10">
        <h2 className="text-xs font-bold tracking-[.16em] text-ink-3 uppercase">Trusted outlets</h2>
        {[1, 2].map((tier) => (
          <div key={tier} className="mt-3">
            <h3 className="text-sm font-semibold">{tierName[tier]}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {outlets
                .filter(([, o]) => o.tier === tier)
                .map(([, o]) => o.name)
                .filter((n, i, a) => a.indexOf(n) === i)
                .join(", ")}
            </p>
          </div>
        ))}
        <p className="mt-3 text-sm text-ink-3">Not shown: state-controlled outlets ({sources.blocked.join(", ")}).</p>
      </section>
    </main>
  );
}
