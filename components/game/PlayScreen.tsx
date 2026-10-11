"use client";

import { ArrowLeft, Globe2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { Marker } from "@/components/globe/Marker";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { REGION_DEFS } from "@/lib/game/engine/regions";
import { ranks, trend } from "@/lib/game/engine/score";
import { TURN_SECONDS } from "@/lib/game/engine/rules";
import type { Iso3 } from "@/lib/game/engine/types";
import { REGIONS, SEATS } from "@/lib/game/engine/types";
import { focus } from "@/lib/game/camera";
import { sound } from "@/lib/game/sound";
import { moneyCommitted, pcLeft, useGame, type Tab } from "@/lib/game/store";
import { CAPITAL, SEAT_COLOR, SHORT, money } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Delta, MoveDots, Portrait, TrendChip, eyebrow, glass } from "./bits";
import { CommandPanel } from "./CommandPanel";
import { Coach, EndScreen, PickScreen, Reveal } from "./Overlays";

/** Statecraft solo match on the 1.0 globe (BUILD-PLAN S3). */
export function PlayScreen() {
  const phase = useGame((s) => s.phase);

  // The globe switches to game layers while this screen is mounted.
  useEffect(() => {
    const g = useGlobe.getState();
    g.setPlay(true);
    g.select(null);
    g.setMode("home");
    return () => useGlobe.getState().setPlay(false);
  }, []);

  // Tapping another leader's country on the globe opens a deal with them.
  useEffect(
    () =>
      useGlobe.subscribe((s, prev) => {
        if (s.selectedIso3 === prev.selectedIso3 || !s.selectedIso3) return;
        const iso = s.selectedIso3 as Iso3;
        const game = useGame.getState();
        if (game.phase === "plan" && SEATS.includes(iso) && iso !== game.setup.me) {
          game.setCompose({ to: iso, gives: [], wants: [], turns: 3 });
          game.setTab("deals");
          sound.click();
        }
        setTimeout(() => useGlobe.getState().select(null), 0);
      }),
    [],
  );

  // Timer (solo: optional) and keyboard.
  useEffect(() => {
    const id = setInterval(() => useGame.getState().tick(), 1000);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,select,textarea,[role=dialog]")) return;
      const g = useGame.getState();
      if (g.phase === "result" && (e.key === "Enter" || e.key.toLowerCase() === "l")) g.next();
      if (g.phase !== "plan") return;
      const tabs: Tab[] = ["year", "moves", "deals", "advanced"];
      const n = "1234".indexOf(e.key);
      if (n >= 0) g.setTab(tabs[n]);
      if (e.key.toLowerCase() === "l") g.lock();
      if (e.key.toLowerCase() === "v") g.toggleWorldView();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(48% 62% at 50% 52%, #d7e3ea 0%, rgba(215,227,234,.6) 45%, rgba(243,241,236,0) 75%), linear-gradient(180deg,#f6f4ef,#efede7)" }}
      />
      <GlobeClient variant="game">
        <SeatLabels />
      </GlobeClient>
      <h1 className="sr-only">Statecraft: lead a country, shape the world</h1>
      {phase !== "pick" && phase !== "end" && (
        <>
          <TopBar />
          <Rail />
          <News />
          <CommandPanel />
        </>
      )}
      <PickScreen />
      <Reveal />
      <EndScreen />
      <Coach />
    </main>
  );
}

function SeatLabels() {
  const world = useGame((s) => s.world);
  const me = useGame((s) => s.setup.me);
  const phase = useGame((s) => s.phase);
  if (!world && phase !== "pick") return null;
  return (
    <div aria-hidden={phase === "pick"} className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      {SEATS.map((s) => (
        <Marker key={s} lat={CAPITAL[s][0]} lng={CAPITAL[s][1]} interactive>
          <button
            type="button"
            onClick={() => useGlobe.getState().select(s)}
            className={cn(
              "flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-[11.5px] font-bold whitespace-nowrap shadow-[0_6px_18px_rgba(17,35,43,.18)]",
              s === me ? "border-[var(--gold)] bg-[var(--ink-strong)] text-white ring-2 ring-[var(--gold)]" : "border-white/80 bg-white/90 text-ink hover:bg-white",
            )}
            title={s === me ? "Your country" : `Offer ${SHORT[s]} a deal`}
          >
            <Flag iso3={s} className="h-3 w-[18px]" />
            {SHORT[s]}
          </button>
        </Marker>
      ))}
    </div>
  );
}

function TopBar() {
  const world = useGame((s) => s.world)!;
  const setup = useGame((s) => s.setup);
  const phase = useGame((s) => s.phase);
  const timeLeft = useGame((s) => s.timeLeft);
  const paused = useGame((s) => s.paused);
  const worldView = useGame((s) => s.worldView);
  const left = useGame(pcLeft);
  const committed = useGame((s) => (s.phase === "plan" || s.phase === "locking" ? moneyCommitted(s) : 0));
  const [muted, setMuted] = useState(sound.isMuted);
  const c = world.countries[setup.me];
  const r = ranks(world)[setup.me];
  const r0 = ranks(world, 0)[setup.me];
  const total = TURN_SECONDS(world.turn);
  const year = world.ended || phase === "reveal" || phase === "result" ? world.year - 1 : world.year;
  return (
    <header className="pointer-events-none fixed inset-x-4 top-[max(14px,env(safe-area-inset-top))] z-30 grid grid-cols-[1fr_auto_1fr] items-start gap-3 max-md:inset-x-2.5 max-md:grid-cols-[1fr_auto]">
      <div className={cn(glass, "pointer-events-auto flex items-center gap-3 justify-self-start py-2 pr-4 pl-2 max-md:gap-2 max-md:pr-2.5")}>
        <Link href="/" aria-label="Leave the match" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-paper">
          <ArrowLeft className="size-[18px]" />
        </Link>
        <Portrait i={setup.portrait} seat={SEAT_COLOR[setup.me]} size={36} />
        <div className="leading-tight max-md:hidden">
          <b className="flex items-center gap-1.5 text-[13px] tracking-[.12em]">
            <Flag iso3={setup.me} className="h-3 w-[18px]" /> {SHORT[setup.me].toUpperCase()}
          </b>
          <small className="text-[11.5px] text-ink-3">{setup.leader}</small>
        </div>
        <div className="flex items-center gap-4 border-l border-border pl-3 max-md:gap-2.5 max-md:pl-2">
          <div>
            <span className="block text-[10.5px] font-extrabold tracking-[.12em] text-ink-3 uppercase">Treasury</span>
            <span className="text-[18px] font-extrabold tabular-nums max-md:text-[15px]">{money(c.treasury - committed)}</span>
          </div>
          <div>
            <span className="block text-[10.5px] font-extrabold tracking-[.12em] text-ink-3 uppercase">Moves</span>
            <span className="mt-1.5 block">
              <MoveDots left={left} total={c.pc} />
            </span>
          </div>
        </div>
      </div>
      <div className={cn(glass, "pointer-events-auto flex items-center gap-3 py-2 pr-4 pl-3")}>
        {setup.timed && (
          <div className="relative size-11">
            <svg viewBox="0 0 46 46" className="size-11 -rotate-90">
              <circle cx="23" cy="23" r="20" fill="none" strokeWidth="4" stroke="#e2ded4" />
              <circle cx="23" cy="23" r="20" fill="none" strokeWidth="4" strokeLinecap="round" stroke={timeLeft <= 10 ? "var(--conflict)" : "var(--ink)"} strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - timeLeft / total)} />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[12px] font-extrabold tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}
        <div className="leading-none">
          <div className="font-display text-[26px] font-semibold tabular-nums max-md:text-[20px]">{year}</div>
          <small className="text-[11.5px] font-semibold text-ink-3">{phase === "locking" ? "Leaders are locking…" : phase === "reveal" ? "The world moves" : phase === "result" ? "Year resolved" : `Year ${Math.min(12, world.turn)} of 12${paused ? " · paused" : ""}`}</small>
        </div>
      </div>
      <div className="pointer-events-auto flex items-center gap-2 justify-self-end max-md:hidden">
        <div className={cn(glass, "flex items-center gap-2 px-4 py-2.5 font-extrabold")}>
          <small className="text-[10.5px] tracking-[.12em] text-ink-3">POWER RANK</small> #{r}
          {r !== r0 && <Delta v={r0 - r} d={0} />}
        </div>
        <IconBtn label="World view (V): influence, all treaties and sanctions" on={worldView} onClick={() => useGame.getState().toggleWorldView()}>
          <Globe2 className="size-[18px]" />
        </IconBtn>
        <IconBtn
          label={muted ? "Sound off" : "Sound on"}
          onClick={() => {
            sound.setMuted(!muted);
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
        </IconBtn>
        {setup.timed && (
          <IconBtn label={paused ? "Resume the timer" : "Pause the timer"} onClick={() => useGame.getState().togglePause()}>
            {paused ? <Play className="size-[18px]" /> : <Pause className="size-[18px]" />}
          </IconBtn>
        )}
      </div>
    </header>
  );
}

function IconBtn({ label, on, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={on} onClick={onClick} className={cn("grid size-[42px] place-items-center rounded-full border border-border shadow-[var(--shadow-card)] transition", on ? "bg-[var(--ink-strong)] text-white" : "bg-white/90 text-ink-2 hover:text-ink")}>
      {children}
    </button>
  );
}

function Rail() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const botLocks = useGame((s) => s.botLocks);
  const phase = useGame((s) => s.phase);
  const [table, setTable] = useState(false);
  const r = ranks(world);
  const order = [...SEATS].sort((a, b) => r[a] - r[b]);
  const sanctions = SEATS.reduce((t, a) => t + SEATS.filter((b) => b !== a && world.pairs[a][b].sanction).length, 0);
  const led = REGIONS.filter((x) => world.regions[x].leader === me).length;
  return (
    <aside aria-label="World Power Index" className={cn(glass, "fixed top-[92px] left-4 z-20 w-[272px] p-4 max-[1100px]:w-[244px] max-md:hidden")}>
      <div className="flex items-center justify-between">
        <span className={eyebrow}>World Power Index</span>
        <button className="text-[11px] font-extrabold tracking-[.08em] text-[var(--neutral)] uppercase hover:underline" onClick={() => setTable(true)}>
          World table
        </button>
      </div>
      <motion.ol layout className="mt-2.5 grid">
        {order.map((s) => {
          const locked = phase === "locking" ? !!botLocks[s] || s === me : false;
          return (
            <motion.li key={s} layout transition={{ type: "spring", bounce: 0.2, visualDuration: 0.5 }} className={cn("grid grid-cols-[16px_30px_1fr_auto] items-center gap-2.5 rounded-xl px-1.5 py-2", s === me && "bg-[rgba(242,179,61,.16)] shadow-[inset_0_0_0_1px_rgba(242,179,61,.5)]")}>
              <span className="text-[13px] font-extrabold text-ink-3">{r[s]}</span>
              <Portrait i={SEATS.indexOf(s)} seat={SEAT_COLOR[s]} size={28} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-[13.5px] font-bold">
                  <Flag iso3={s} className="h-3 w-[18px]" />
                  {SHORT[s]}
                </div>
                {trend(world, s, "economy") !== "unchanging" && <TrendChip t={trend(world, s, "economy")} />}
              </div>
              <div className="text-right">
                <div className="text-[15px] font-extrabold tabular-nums">{(world.power[s].at(-1) ?? 0).toFixed(1)}</div>
                {phase === "locking" && <span className={cn("inline-block size-2 rounded-full border-2", locked ? "border-[var(--ally)] bg-[var(--ally)]" : "border-ink-3")} title={locked ? "Locked" : "Thinking"} />}
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-ink-3">
        <Stat v={world.treaties.length} l="Treaties" />
        <Stat v={sanctions} l="Sanctions" />
        <Stat v={`${led}/8`} l="Regions you lead" />
        <Stat v={world.tension.toFixed(0)} l="World tension" />
      </div>
      <Sheet open={table} onOpenChange={setTable}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-paper sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">World table</SheetTitle>
          </SheetHeader>
          <div className="grid gap-5 px-4 pb-8 text-[13px]">
            <div>
              <div className={cn(eyebrow, "mb-2")}>Treaties ({world.treaties.length})</div>
              {world.treaties.length === 0 && <p className="text-ink-3">None yet.</p>}
              {world.treaties.map((t) => (
                <div key={t.id} className="mb-1.5 rounded-xl border border-border bg-white p-2.5 font-bold">
                  <Flag iso3={t.a} /> {SHORT[t.a]} ⇄ <Flag iso3={t.b} /> {SHORT[t.b]} <span className="font-semibold text-ink-3">· {t.turnsLeft} yr left</span>
                </div>
              ))}
            </div>
            <div>
              <div className={cn(eyebrow, "mb-2")}>Sanctions and tariffs</div>
              {SEATS.flatMap((a) =>
                SEATS.filter((b) => b !== a && (world.pairs[a][b].sanction || world.pairs[a][b].tariff)).map((b) => (
                  <div key={a + b} className="mb-1.5 rounded-xl border border-border bg-white p-2.5 font-bold">
                    {SHORT[a]} {world.pairs[a][b].sanction ? "sanctions" : `has a ${world.pairs[a][b].tariff}% tariff on`} {SHORT[b]}
                  </div>
                )),
              )}
            </div>
            <div>
              <div className={cn(eyebrow, "mb-2")}>Partner regions</div>
              {REGIONS.map((rg) => {
                const reg = world.regions[rg];
                const top = [...SEATS].sort((a, b) => reg.sway[b] - reg.sway[a]).slice(0, 3);
                return (
                  <div key={rg} className="mb-1.5 rounded-xl border border-border bg-white p-2.5">
                    <b>
                      {REGION_DEFS[rg].name} · {reg.leader ? `led by ${SHORT[reg.leader]}` : "no leader"}
                    </b>
                    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
                      {top.map((s) => (
                        <i key={s} style={{ flexGrow: reg.sway[s], background: SEAT_COLOR[s] }} />
                      ))}
                      <i style={{ flexGrow: Math.max(0, 100 - top.reduce((t, s) => t + reg.sway[s], 0)), background: "#eae7df" }} />
                    </div>
                    <small className="text-ink-3">{top.map((s) => `${SHORT[s]} ${reg.sway[s].toFixed(0)}`).join(" · ")}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-white px-2.5 py-2">
      <b className="block text-[16px] text-ink tabular-nums">{v}</b>
      {l}
    </div>
  );
}

function News() {
  const world = useGame((s) => s.world)!;
  const phase = useGame((s) => s.phase);
  const last = world.history.at(-1);
  if (!last || phase === "reveal") return null;
  return (
    <section aria-label="World news" className="fixed bottom-4 left-4 z-10 w-[340px] rounded-xl border border-[rgba(122,92,46,.2)] bg-[#FBF7EE] p-4 shadow-[var(--shadow-card)] max-[1100px]:hidden">
      <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold tracking-[.14em] text-[#7A5C2E] uppercase">
        World news · {last.year}
        <span className="-rotate-3 rounded border-[1.5px] border-current px-1.5 py-px text-[9px]">Simulated</span>
      </div>
      <ul className="grid gap-2">
        {last.news.slice(0, 3).map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="text-left font-display text-[14.5px] leading-snug text-[#3d2f18] italic hover:underline"
              onClick={() => {
                if (n.iso3) focus(CAPITAL[n.iso3][0], CAPITAL[n.iso3][1], 3.0);
              }}
            >
              {n.headline}
            </button>
            <small className="block text-[11px] text-ink-3">{n.place ?? (n.iso3 ? SHORT[n.iso3] : "World")}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
