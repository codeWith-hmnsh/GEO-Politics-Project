"use client";

import { Check, Copy, Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { MISSIONS } from "@/lib/game/engine/score";
import type { ScenarioId } from "@/lib/game/engine/types";
import { SEATS } from "@/lib/game/engine/types";
import { ApiError, api, ensureSession, onlineAvailable, saveProfile, savedProfile, subscribeMatch } from "@/lib/game/online";
import type { MatchView } from "@/lib/game/onlineTypes";
import { useGame } from "@/lib/game/store";
import { LEADERS, NAMES, SEAT_COLOR, cap } from "@/lib/game/text";
import { cn } from "@/lib/utils";
import { Btn, Portrait, eyebrow, glass } from "./bits";
import { PlayScreen } from "./PlayScreen";
import { useWarRoom } from "./WarRoom";

const SCEN: Record<ScenarioId, string> = { energyShock: "Energy Shock", foodCrisis: "Food Crisis", tradeWar: "Trade War", calmStart: "Calm Start" };

/** A private room: lobby until the host starts, then the shared match (docs4.0/MULTIPLAYER.md §3). */
export function RoomScreen({ code }: { code: string }) {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [view, setView] = useState<MatchView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!onlineAvailable()) throw new Error("Multiplayer is not set up on this site yet.");
        await ensureSession();
        const p = savedProfile();
        const res = await api<{ matchId: string }>(`/api/game/rooms/${code}`, { op: "join", leader: p.leader, portrait: p.portrait });
        if (!alive) return;
        // a fresh store for this match (a solo match may have run in this tab before)
        useGame.setState({ phase: "pick", world: null, prev: null, orders: {}, proposals: [], record: null, impact: null, tutorial: null, showcase: null, worldView: false, view: null, seats: [] });
        setMatchId(res.matchId);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const refresh = useCallback(async () => {
    if (!matchId) return;
    try {
      const v = await api<MatchView>(`/api/game/matches/${matchId}`);
      setView(v);
      if (v.match.phase !== "lobby") useGame.getState().syncView(v);
    } catch (e) {
      // a lost connection is retried by the next poll; a refusal ends the visit
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) setError(e.message);
    }
  }, [matchId]);

  // live notices plus a slow poll as a fallback (MULTIPLAYER §8)
  useEffect(() => {
    if (!matchId) return;
    const call = (op: string, body: Record<string, unknown> = {}) => api(`/api/game/matches/${matchId}`, { op, ...body });
    useGame.getState().setNet({ matchId, code, call, refresh: () => void refresh() });
    const first = setTimeout(() => void refresh(), 0);
    const unsub = subscribeMatch(matchId, () => void refresh());
    const id = setInterval(() => void refresh(), 3000);
    return () => {
      unsub();
      clearTimeout(first);
      clearInterval(id);
      useGame.getState().setNet(null);
    };
  }, [matchId, code, refresh]);

  if (error)
    return (
      <Center>
        <div className={cn(glass, "grid max-w-[440px] gap-4 p-7 text-center")}>
          <h1 className="font-display text-[28px]">Room {code.toUpperCase()}</h1>
          <p className="text-ink-2">{error}</p>
          <Link href="/play" className="justify-self-center rounded-full bg-[var(--cta)] px-5 py-3 text-[14px] font-bold text-[var(--cta-ink)]">
            Back to the Play page
          </Link>
        </div>
      </Center>
    );
  if (!matchId || !view)
    return (
      <Center>
        <div className="flex items-center gap-3 font-hud text-[13px] font-semibold tracking-[.2em] text-[var(--hud-dim)] uppercase">
          <Loader2 className="size-5 animate-spin text-[var(--intel)]" /> Joining room {code.toUpperCase()}…
        </div>
      </Center>
    );
  if (view.match.phase === "lobby") return <Lobby view={view} refresh={refresh} />;
  return <OnlineMatch matchId={matchId} code={view.match.code} />;
}

function Center({ children }: { children: React.ReactNode }) {
  useWarRoom();
  return (
    <main className="war relative grid min-h-dvh place-items-center overflow-hidden bg-[#03060b] px-5 text-ink">
      <div aria-hidden className="war-space pointer-events-none fixed inset-0" />
      <Radar />
      <div aria-hidden className="war-fx war-vignette" />
      <div aria-hidden className="war-fx war-scan" />
      <div aria-hidden className="war-fx war-grain" />
      <div className="relative z-10 w-full justify-items-center grid">{children}</div>
    </main>
  );
}

/** Slow radar sweep behind the lobby: range rings, a cross-hair and a rotating beam. */
function Radar() {
  return (
    <div aria-hidden className="pointer-events-none fixed top-1/2 left-1/2 size-[min(1100px,150vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90">
      <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,transparent_0_79px,rgba(103,232,249,.09)_79px_80px)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[rgba(103,232,249,.08)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(103,232,249,.08)]" />
      <div className="absolute inset-0 animate-[war-sweep_7s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,rgba(103,232,249,.22),rgba(103,232,249,0)_22%,transparent)] motion-reduce:animate-none" />
    </div>
  );
}

function Lobby({ view, refresh }: { view: MatchView; refresh: () => Promise<void> }) {
  const code = view.match.code;
  const mine = view.seats.find((s) => s.you)!;
  const [leader, setLeader] = useState(mine.leader);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const humans = view.seats.filter((s) => s.kind === "human").length;

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/game/rooms/${code}`, body);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/play/room/${code}`;

  return (
    <Center>
      <div className={cn(glass, "my-10 w-[min(1020px,100%)] p-7 max-md:p-5")}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="war-live font-hud text-[10.5px] font-semibold tracking-[.26em] text-[var(--alert)] uppercase">Live · private room · unranked</div>
            <h1 className="mt-2 font-display text-[clamp(34px,5vw,56px)] leading-none">Room {code}</h1>
            <p className="mt-2.5 max-w-[52ch] text-[14.5px] text-ink-2">Share the code. Friends pick a country; bots lead every free seat when the host starts.</p>
          </div>
          <div className="grid justify-items-end gap-2 max-md:justify-items-start">
            <span className="font-hud text-[9.5px] font-semibold tracking-[.24em] text-[var(--hud-dim)] uppercase">Access code</span>
            <div className="flex items-center gap-2">
              <span className="relative rounded-md border border-[rgba(103,232,249,.4)] bg-[rgba(103,232,249,.06)] px-4 py-2 font-hud text-[26px] font-bold tracking-[.32em] text-[var(--intel)] [text-shadow:0_0_14px_rgba(103,232,249,.6)]">{code}</span>
              <Btn
                variant="glass"
                className="rounded-md"
                onClick={() =>
                  navigator.clipboard?.writeText(link).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  )
                }
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy invite link"}
              </Btn>
            </div>
          </div>
        </div>

        <div className="mt-7 mb-2.5 flex items-center justify-between font-hud text-[10px] font-semibold tracking-[.22em] text-[var(--hud-dim)] uppercase">
          <span>Seats at the table</span>
          <span>
            {humans} / 6 human
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
          {SEATS.map((iso) => {
            const s = view.seats.find((x) => x.iso3 === iso)!;
            const free = s.kind !== "human";
            return (
              <button
                key={iso}
                disabled={busy || (!free && !s.you)}
                onClick={() => free && act({ op: "seat", iso3: iso, leader, portrait: mine.portrait })}
                style={{ borderTopColor: SEAT_COLOR[iso] }}
                className={cn(
                  "grid gap-2 rounded-lg border border-t-2 bg-[rgba(255,255,255,.03)] p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:bg-[rgba(255,255,255,.06)]",
                  s.you ? "border-[var(--gold)] bg-[rgba(242,179,61,.07)] shadow-[0_0_0_1px_var(--gold),0_0_28px_rgba(242,179,61,.2)]" : "border-border",
                  !free && !s.you && "opacity-90",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Flag iso3={iso} className="h-[22px] w-8 rounded-[3px]" />
                  <b className="text-[16px]">{NAMES[iso]}</b>
                  <span className={cn("ml-auto font-hud text-[9px] font-semibold tracking-[.18em] uppercase", free ? "text-ink-3" : s.you ? "text-[var(--gold)]" : "text-[var(--up)]")}>{free ? "Open" : s.you ? "You" : "Taken"}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Portrait i={s.portrait} seat={SEAT_COLOR[iso]} size={26} />
                  {free ? (
                    <span className="font-semibold text-ink-3">Bot · tap to lead</span>
                  ) : (
                    <span className="font-bold">
                      {s.leader}
                      {s.you && " (you)"}
                      {view.match.host && !s.you && <span className="ml-1 text-ink-3">{s.online ? "· online" : "· away"}</span>}
                    </span>
                  )}
                </div>
                <small className="text-[12px] text-ink-2">{MISSIONS[iso].text}</small>
              </button>
            );
          })}
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto] items-end gap-6 border-t border-border pt-6 max-md:grid-cols-1">
          <div className="grid gap-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={cn(eyebrow, "w-[110px] whitespace-nowrap")}>Your leader</span>
              <input
                id="room-leader"
                aria-label="Leader name"
                maxLength={20}
                value={leader}
                placeholder={LEADERS[mine.iso3]}
                onChange={(e) => setLeader(e.target.value)}
                onBlur={() => {
                  saveProfile({ leader, portrait: mine.portrait });
                  void act({ op: "profile", leader, portrait: mine.portrait });
                }}
                className="h-10 w-[200px] rounded-md border border-[var(--input)] bg-[rgba(255,255,255,.04)] px-4 text-[14px] outline-none focus:border-[var(--intel)]"
              />
              <div className="flex gap-1.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <button
                    key={i}
                    aria-label={`Portrait ${i + 1}`}
                    onClick={() => {
                      saveProfile({ leader, portrait: i });
                      void act({ op: "profile", leader, portrait: i });
                    }}
                    className={cn("rounded-full", mine.portrait === i && "outline-2 outline-offset-2 outline-[var(--gold)]")}
                  >
                    <Portrait i={i} seat={SEAT_COLOR[mine.iso3]} size={28} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(eyebrow, "w-[110px]")}>Scenario</span>
              {(Object.keys(SCEN) as ScenarioId[]).map((id) => (
                <Chip key={id} on={view.match.scenario === id} disabled={!view.isHost || busy} onClick={() => act({ op: "settings", scenario: id })}>
                  {SCEN[id]}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(eyebrow, "w-[110px]")}>Bots</span>
              {(["easy", "normal", "hard"] as const).map((d) => (
                <Chip key={d} on={view.match.difficulty === d} disabled={!view.isHost || busy} onClick={() => act({ op: "settings", difficulty: d })}>
                  {cap(d)}
                </Chip>
              ))}
              <span className={cn(eyebrow, "ml-3")}>Turn</span>
              {[90, 150].map((t) => (
                <Chip key={t} on={view.match.turnSeconds === t} disabled={!view.isHost || busy} onClick={() => act({ op: "settings", turnSeconds: t })}>
                  {t === 90 ? "90 seconds" : "150 seconds"}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid justify-items-end gap-2 max-md:justify-items-start">
            <span className="font-hud text-[11px] font-semibold tracking-[.12em] text-ink-2">
              {humans} {humans === 1 ? "leader" : "leaders"} in the room · {6 - humans} bot{6 - humans === 1 ? "" : "s"}
            </span>
            {view.isHost ? (
              <Btn className="min-h-12 min-w-[220px] rounded-[10px] font-hud text-[13px] tracking-[.18em] uppercase shadow-[0_0_30px_rgba(103,232,249,.3)]" disabled={busy} onClick={() => act({ op: "start" })}>
                <Crown className="size-4" /> Start the match
              </Btn>
            ) : (
              <span className="war-live rounded-md border border-border bg-[rgba(255,255,255,.04)] px-4 py-2.5 font-hud text-[12px] font-semibold tracking-[.1em] text-ink-2">Waiting for the host to start…</span>
            )}
            {err && <span className="text-[13px] font-semibold text-[var(--down)]">{err}</span>}
          </div>
        </div>
      </div>
    </Center>
  );
}

function Chip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={cn("h-8 rounded-md border px-3.5 text-[13px] font-semibold disabled:cursor-default", on ? "border-[var(--intel)] bg-[rgba(103,232,249,.14)] text-[var(--intel)] shadow-[0_0_12px_rgba(103,232,249,.25)]" : "border-[var(--input)] bg-[rgba(255,255,255,.03)] text-ink-2", disabled && !on && "opacity-60")}>
      {children}
    </button>
  );
}

/** The shared match: the same game screen, with the server as the authority. */
function OnlineMatch({ matchId, code }: { matchId: string; code: string }) {
  // send orders to the server while the player plans (they are read again at resolve)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let last = "";
    const unsub = useGame.subscribe((s) => {
      if (s.phase !== "plan" || !s.net) return;
      const json = JSON.stringify(s.orders);
      if (json === last) return;
      last = json;
      clearTimeout(t);
      t = setTimeout(() => {
        s.net?.call("orders", { orders: s.orders }).catch((e: Error) => useGame.getState().setNetError(e.message));
      }, 600);
    });
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, []);

  return <PlayScreen online={{ matchId, code }} />;
}
