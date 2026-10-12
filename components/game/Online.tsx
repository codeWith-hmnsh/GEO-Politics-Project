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
          <h1 className="font-display text-[28px] font-semibold">Room {code.toUpperCase()}</h1>
          <p className="text-ink-2">{error}</p>
          <Link href="/play" className="justify-self-center rounded-full bg-[var(--ink-strong)] px-5 py-3 text-[14px] font-bold text-white">
            Back to the Play page
          </Link>
        </div>
      </Center>
    );
  if (!matchId || !view)
    return (
      <Center>
        <div className="flex items-center gap-3 text-[15px] font-semibold text-ink-2">
          <Loader2 className="size-5 animate-spin" /> Joining room {code.toUpperCase()}…
        </div>
      </Center>
    );
  if (view.match.phase === "lobby") return <Lobby view={view} refresh={refresh} />;
  return <OnlineMatch matchId={matchId} code={view.match.code} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-paper px-5" style={{ background: "radial-gradient(60% 50% at 50% 35%, #dfe9ee 0%, #f3f1ec 70%)" }}>{children}</main>;
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
      <div className={cn(glass, "my-10 w-[min(980px,100%)] p-7 max-md:p-5")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={eyebrow}>Private room · unranked</div>
            <h1 className="mt-1.5 font-display text-[clamp(34px,5vw,56px)] leading-none font-semibold">Room {code}</h1>
            <p className="mt-2 text-[14.5px] text-ink-2">Share the code. Friends pick a country; bots lead every free seat when the host starts.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-dashed border-[rgba(17,35,43,.25)] bg-paper px-4 py-2.5 font-mono text-[22px] font-bold tracking-[.3em]">{code}</span>
            <Btn
              variant="glass"
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

        <div className="mt-6 grid grid-cols-3 gap-3 max-md:grid-cols-1">
          {SEATS.map((iso) => {
            const s = view.seats.find((x) => x.iso3 === iso)!;
            const free = s.kind !== "human";
            return (
              <button
                key={iso}
                disabled={busy || (!free && !s.you)}
                onClick={() => free && act({ op: "seat", iso3: iso, leader, portrait: mine.portrait })}
                className={cn("grid gap-2 rounded-2xl border bg-white p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[var(--shadow-card)]", s.you ? "border-[var(--gold)] shadow-[0_0_0_2px_var(--gold)]" : "border-border", !free && !s.you && "opacity-90")}
              >
                <div className="flex items-center gap-2.5">
                  <Flag iso3={iso} className="h-[22px] w-8 rounded" />
                  <b className="text-[16px]">{NAMES[iso]}</b>
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

        <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-6 max-md:grid-cols-1">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={eyebrow}>Your leader</span>
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
                className="h-10 w-[200px] rounded-full border border-[rgba(17,35,43,.16)] bg-white px-4 text-[14px]"
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
              <span className={eyebrow}>Scenario</span>
              {(Object.keys(SCEN) as ScenarioId[]).map((id) => (
                <Chip key={id} on={view.match.scenario === id} disabled={!view.isHost || busy} onClick={() => act({ op: "settings", scenario: id })}>
                  {SCEN[id]}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={eyebrow}>Bots</span>
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
            <span className="text-[13px] font-semibold text-ink-2">
              {humans} {humans === 1 ? "leader" : "leaders"} in the room · {6 - humans} bot{6 - humans === 1 ? "" : "s"}
            </span>
            {view.isHost ? (
              <Btn className="min-w-[200px]" disabled={busy} onClick={() => act({ op: "start" })}>
                <Crown className="size-4" /> Start the match
              </Btn>
            ) : (
              <span className="rounded-full bg-paper px-4 py-2.5 text-[13.5px] font-bold text-ink-2">Waiting for the host to start…</span>
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
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={cn("h-8 rounded-full border px-3.5 text-[13px] font-semibold disabled:cursor-default", on ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[rgba(17,35,43,.16)] bg-white text-ink-2", disabled && !on && "opacity-60")}>
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
