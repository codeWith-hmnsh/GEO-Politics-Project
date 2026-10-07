import type { Metadata } from "next";
import Link from "next/link";
import glossary from "@/data/curated/glossary.json";

export const metadata: Metadata = { title: "Glossary · GeoPolitics", description: "Forty geopolitics terms in plain English." };

const GROUPS = ["Organisations", "Security", "Economy", "Energy"];

export default function GlossaryPage() {
  const terms = glossary.terms as { id: string; term: string; group: string; def: string; related: string[]; org?: string; members?: string[]; place?: number[] }[];
  const name = (id: string) => terms.find((t) => t.id === id)?.term ?? id;
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-ink">
      <Link href="/" className="text-sm font-semibold text-ink-2 hover:text-ink">
        ← Back to the globe
      </Link>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance">Glossary</h1>
      <p className="mt-3 leading-relaxed text-ink-2">Forty words that come up again and again in world news, each in two plain sentences.</p>
      <nav aria-label="Groups" className="mt-6 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <a key={g} href={`#${g.toLowerCase()}`} className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper">
            {g}
          </a>
        ))}
      </nav>
      {GROUPS.map((g) => (
        <section key={g} id={g.toLowerCase()} className="mt-10 scroll-mt-6">
          <h2 className="text-xs font-bold tracking-[.16em] text-ink-3 uppercase">{g}</h2>
          <dl className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white">
            {terms
              .filter((t) => t.group === g)
              .map((t) => (
                <div key={t.id} id={t.id} className="scroll-mt-6 p-4">
                  <dt className="flex items-baseline justify-between gap-3">
                    <b className="text-base">{t.term}</b>
                    {(t.org || t.members?.length || t.place) && (
                      <Link href={`/?term=${t.id}`} className="shrink-0 text-sm font-semibold text-ink-2 underline underline-offset-2 hover:text-ink">
                        See on globe
                      </Link>
                    )}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-2">{t.def}</dd>
                  {t.related.length > 0 && (
                    <dd className="mt-2 text-xs text-ink-3">
                      Related:{" "}
                      {t.related.map((r, i) => (
                        <span key={r}>
                          {i > 0 && ", "}
                          <a href={`#${r}`} className="font-semibold text-ink-2 hover:underline">
                            {name(r)}
                          </a>
                        </span>
                      ))}
                    </dd>
                  )}
                </div>
              ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
