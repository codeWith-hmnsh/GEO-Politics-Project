"use client";

import { useCountryFacts } from "@/lib/api";

/** "Capital · leaders" line under a country name (Wikidata). */
export function CountryFacts({ iso3 }: { iso3: string }) {
  const { data, isPending } = useCountryFacts(iso3);
  const p = data?.data.profile;
  if (isPending) return <p className="mt-1 h-4 w-48 animate-pulse rounded bg-paper" aria-hidden />;
  if (!p) return null;
  // Always name the role, so a missing head of state never makes the prime minister look like the leader.
  const head =
    p.headOfState && p.headOfState === p.headOfGovernment
      ? `Head of state and government ${p.headOfState}`
      : [p.headOfState && `Head of state ${p.headOfState}`, p.headOfGovernment && `Head of government ${p.headOfGovernment}`]
          .filter(Boolean)
          .join(" · ");
  const parts = [p.capital && `Capital ${p.capital}`, head].filter(Boolean);
  return (
    <p className="mt-1 text-[13px] leading-snug text-ink-2">
      {parts.join(" · ")}
      <span className="text-ink-3"> · Wikidata</span>
    </p>
  );
}
