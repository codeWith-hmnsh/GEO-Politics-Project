"use client";

import { Bell, Calendar, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { timeAgo, useNews, usePulse } from "@/lib/api";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { homeView, useGlobe } from "@/lib/store";

const NAV = [
  { id: "home", label: "Home", ready: true },
  { id: "brief", label: "Daily Brief", ready: false },
  { id: "stories", label: "Stories", ready: false },
  { id: "glossary", label: "Glossary", ready: false },
  { id: "sources", label: "Sources", ready: true },
] as const;

export function goHome() {
  const s = useGlobe.getState();
  s.select(null);
  s.setMode("home");
  s.flyTo(homeView());
}

export function Logo() {
  return (
    <button type="button" onClick={goHome} aria-label="GeoPolitics home" className="pointer-events-auto flex items-center gap-3 text-left">
      <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-[var(--ink-strong)] max-md:size-[34px]">
        <span className="relative block h-4 w-[26px]">
          <span className="absolute left-0 top-0 size-4 rounded-full bg-gold" />
          <span className="absolute right-0 top-0 size-4 rounded-full border-[2.5px] border-white" />
        </span>
      </span>
      <span>
        <b className="block text-[22px] leading-none font-bold tracking-tight max-md:text-lg">GeoPolitics</b>
        <small className="mt-1 block text-[12.5px] text-ink-2 max-md:hidden">The world, explained</small>
      </span>
    </button>
  );
}

function SoonTip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function CountrySearch() {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  const { data: pulse } = usePulse();

  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = (c: IndexedCountry) => {
    setOpen(false);
    const s = useGlobe.getState();
    s.select(c.iso3);
    s.flyTo({ lat: c.centroid[0], lng: c.centroid[1], dist: 2.8 });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex h-[42px] w-[286px] items-center gap-2.5 rounded-xl border border-border bg-white/85 px-3.5 text-left text-[13px] text-ink-3 backdrop-blur max-xl:w-[220px] max-md:hidden"
      >
        <Search className="size-[18px] shrink-0 text-ink-2" aria-hidden />
        <span className="truncate">Search countries, conflicts, organizations…</span>
        <kbd className="ml-auto rounded border border-border px-1.5 text-[11px] text-ink-3">/</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Find a country, conflict or bloc">
        <Command>
          <CommandInput placeholder="Search countries, conflicts, blocs…" />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            {pulse && (
              <CommandGroup heading="Conflicts">
                {pulse.data.conflicts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${c.parties.join(" ")}`}
                    onSelect={() => {
                      setOpen(false);
                      const s = useGlobe.getState();
                      s.selectConflict(c.id);
                      s.flyTo({ lat: c.at[0], lng: c.at[1], dist: 1.9 });
                    }}
                  >
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {pulse && (
              <CommandGroup heading="Alliances and blocs">
                {pulse.data.organizations.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.id} ${o.name}`}
                    onSelect={() => {
                      setOpen(false);
                      const s = useGlobe.getState();
                      s.selectOrg(o.id);
                      s.flyTo({ lat: o.pin[0], lng: o.pin[1], dist: 3.2 });
                    }}
                  >
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Countries">
              {countries.map((c) => (
                <CommandItem key={c.iso3} value={c.name} onSelect={() => choose(c)}>
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function DateChip() {
  const [today, setToday] = useState("");
  const news = useNews({ limit: 8 });
  const asOf = news.data?.asOf;
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setToday(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="pointer-events-auto flex h-[42px] items-center gap-2.5 rounded-xl border border-border bg-white/85 px-3.5 text-[13px] leading-tight font-semibold whitespace-nowrap backdrop-blur max-lg:hidden">
      <Calendar className="size-[18px]" aria-hidden />
      <span>
        <span suppressHydrationWarning>{today}</span>
        <small className="block text-[11.5px] font-medium text-ink-3">{asOf ? `Updated ${timeAgo(asOf)}` : "Connecting…"}</small>
      </span>
    </div>
  );
}

export function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex h-[72px] items-center gap-9 px-6 max-md:h-[60px] max-md:gap-3 max-md:px-3.5">
      <Logo />
      <nav aria-label="Main" className="pointer-events-auto flex gap-7 max-[1280px]:hidden">
        {NAV.map((n) =>
          n.id === "home" ? (
            <button
              key={n.id}
              type="button"
              onClick={goHome}
              aria-current="page"
              className="relative py-2 text-[14.5px] font-bold after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded after:bg-ink"
            >
              {n.label}
            </button>
          ) : n.ready ? (
            <a key={n.id} href={`/${n.id}`} className="py-2 text-[14.5px] font-medium text-ink-2 hover:text-ink">
              {n.label}
            </a>
          ) : (
            <SoonTip key={n.id} label="Coming soon">
              <button type="button" aria-disabled className="py-2 text-[14.5px] font-medium text-ink-3">
                {n.label}
              </button>
            </SoonTip>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <CountrySearch />
        <DateChip />
        <SoonTip label="Daily Brief — coming soon">
          <button
            type="button"
            aria-label="Daily Brief (coming soon)"
            className="pointer-events-auto relative grid size-[42px] place-items-center rounded-xl border border-border bg-white/85 backdrop-blur max-md:size-10"
          >
            <Bell className="size-[18px]" aria-hidden />
          </button>
        </SoonTip>
      </div>
    </header>
  );
}
