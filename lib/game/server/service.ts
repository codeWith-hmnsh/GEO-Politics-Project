// Statecraft multiplayer rules on the server (docs4.0/MULTIPLAYER.md §3–§4). The engine is the authority;
// clients only send orders, locks, proposals and answers.
import "server-only";
import { decideTurn, type Difficulty } from "../bots/decide";
import { createWorld } from "../engine/init";
import { ENGINE_VERSION } from "../engine/rules";
import { stream } from "../engine/rng";
import { leaderScore, standings } from "../engine/score";
import { proposalLegal } from "../engine/treaties";
import type { Iso3, Proposal, ScenarioId, Term, TurnOrders, TurnRecord, WorldState } from "../engine/types";
import { SEATS } from "../engine/types";
import { answerHumanProposal, closeTurn, planBots, type Plan } from "../match";
import { turnSecondsFor } from "../onlineTypes";
import { SEED_2026 } from "../seed";
import { LEADERS } from "../text";
import { GameError, db, notify } from "./db";

export type SeatKind = "human" | "bot" | "caretaker";
export interface SeatRow {
  match_id: string;
  iso3: Iso3;
  user_id: string | null;
  kind: SeatKind;
  leader_name: string;
  portrait: number;
  locked: boolean;
  ready: boolean;
  empty_turns: number;
  last_seen: string;
}
export interface MatchRow {
  id: string;
  code: string;
  mode: "room" | "quick";
  host: string | null;
  scenario: ScenarioId;
  difficulty: Difficulty;
  seed: number;
  engine_version: string;
  turn: number;
  phase: "lobby" | "plan" | "resolving" | "ended";
  turn_seconds: number;
  deadline_at: string | null;
  state: WorldState | null;
  plan: Plan | null;
  created_at: string;
  ended_at: string | null;
}
interface ProposalRow {
  id: string;
  match_id: string;
  turn: number;
  from_iso3: Iso3;
  to_iso3: Iso3;
  body: { gives: Term[]; wants: Term[]; turns: number; parentId?: string; counterOf?: string; free?: boolean };
  status: Proposal["status"];
}

export type Impact = { growth: number; unemployment: number; inflation: number; stability: number; energy: number; food: number; treasury: number; power: number };
export type OnlineRecord = TurnRecord & { impact?: Partial<Record<Iso3, Impact>> };

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SEAT_ORDER: Iso3[] = ["IND", "CHN", "USA", "RUS", "JPN", "SAU"];
const SCENARIOS: ScenarioId[] = ["energyShock", "foodCrisis", "tradeWar", "calmStart"];
const MAX_PROPOSALS_PER_TURN = 6;

const deadline = (base: number, turn: number) => new Date(Date.now() + turnSecondsFor(base, turn) * 1000).toISOString();
const cleanName = (s: unknown) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20);

/** Turns in the stored world keep only their headline facts; the full record of each turn lives in game_turns. */
export function slim(w: WorldState): WorldState {
  return { ...w, history: w.history.map((h) => ({ ...h, causes: [], globe: [] })) };
}

function toProposal(r: ProposalRow): Proposal {
  return { id: r.id, turn: r.turn, from: r.from_iso3, to: r.to_iso3, gives: r.body.gives, wants: r.body.wants, turns: r.body.turns, status: r.status, parentId: r.body.parentId };
}

async function getMatchBy(field: "id" | "code", value: string): Promise<MatchRow> {
  const { data, error } = await db().from("game_matches").select("*").eq(field, value).maybeSingle();
  if (error) throw error;
  if (!data) throw new GameError("That room does not exist. Check the code.", 404);
  return data as MatchRow;
}

async function getSeats(matchId: string): Promise<SeatRow[]> {
  const { data, error } = await db().from("game_seats").select("*").eq("match_id", matchId);
  if (error) throw error;
  return (data ?? []) as SeatRow[];
}

function mySeat(seats: SeatRow[], userId: string) {
  return seats.find((s) => s.user_id === userId) ?? null;
}

// ───────── rooms and lobby ─────────

export async function createRoom(userId: string, opts: { leader?: string; portrait?: number; scenario?: string; difficulty?: string; turnSeconds?: number }) {
  const scenario = SCENARIOS.includes(opts.scenario as ScenarioId) ? (opts.scenario as ScenarioId) : SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const difficulty = ["easy", "normal", "hard"].includes(opts.difficulty ?? "") ? (opts.difficulty as Difficulty) : "normal";
  const secs = opts.turnSeconds === 150 ? 150 : 90;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    const { data, error } = await db()
      .from("game_matches")
      .insert({ code, mode: "room", host: userId, scenario, difficulty, seed: Math.floor(Math.random() * 2 ** 31), engine_version: ENGINE_VERSION, turn_seconds: secs })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") continue; // code already used
      throw error;
    }
    const match = data as MatchRow;
    const seats = SEATS.map((iso3) => ({ match_id: match.id, iso3, kind: "bot", leader_name: LEADERS[iso3], portrait: SEATS.indexOf(iso3) }));
    const { error: e2 } = await db().from("game_seats").insert(seats);
    if (e2) throw e2;
    await takeSeat(match, await getSeats(match.id), userId, "IND", opts.leader, opts.portrait);
    return { code: match.code, matchId: match.id };
  }
  throw new GameError("Could not create a room. Try again.", 503);
}

async function takeSeat(match: MatchRow, seats: SeatRow[], userId: string, iso3: Iso3, leader?: string, portrait?: number) {
  const target = seats.find((s) => s.iso3 === iso3);
  if (!target) throw new GameError("Unknown country");
  const mine = mySeat(seats, userId);
  if (target.user_id && target.user_id !== userId) throw new GameError(`${iso3} is already taken`, 409);
  const name = cleanName(leader) || mine?.leader_name || LEADERS[iso3];
  const pic = Number.isInteger(portrait) && portrait! >= 0 && portrait! <= 7 ? portrait! : (mine?.portrait ?? 0);
  if (mine && mine.iso3 !== iso3) {
    const { error } = await db().from("game_seats").update({ user_id: null, kind: "bot", leader_name: LEADERS[mine.iso3], portrait: SEATS.indexOf(mine.iso3), ready: false }).eq("match_id", match.id).eq("iso3", mine.iso3);
    if (error) throw error;
  }
  const { error } = await db()
    .from("game_seats")
    .update({ user_id: userId, kind: "human", leader_name: name, portrait: pic, last_seen: new Date().toISOString() })
    .eq("match_id", match.id)
    .eq("iso3", iso3)
    .or(`user_id.is.null,user_id.eq.${userId}`);
  if (error) throw error;
}

export async function joinRoom(code: string, userId: string, leader?: string, portrait?: number) {
  const match = await getMatchBy("code", code.toUpperCase());
  const seats = await getSeats(match.id);
  const mine = mySeat(seats, userId);
  if (mine) {
    if (mine.kind === "caretaker") await db().from("game_seats").update({ kind: "human", empty_turns: 0 }).eq("match_id", match.id).eq("iso3", mine.iso3);
    return { matchId: match.id };
  }
  if (match.phase !== "lobby") throw new GameError("This match has already started.", 409);
  const free = SEAT_ORDER.find((s) => seats.find((x) => x.iso3 === s)?.kind === "bot");
  if (!free) throw new GameError("This room is full.", 409);
  await takeSeat(match, seats, userId, free, leader, portrait);
  await notify(match.id, "lobby");
  return { matchId: match.id };
}

export async function lobbyAction(code: string, userId: string, op: string, body: Record<string, unknown>) {
  const match = await getMatchBy("code", code.toUpperCase());
  const seats = await getSeats(match.id);
  const mine = mySeat(seats, userId);
  if (!mine) throw new GameError("Join the room first.", 403);
  if (match.phase !== "lobby") throw new GameError("The match has already started.", 409);
  if (op === "seat") {
    if (!SEATS.includes(body.iso3 as Iso3)) throw new GameError("Unknown country");
    await takeSeat(match, seats, userId, body.iso3 as Iso3, body.leader as string, body.portrait as number);
  } else if (op === "profile") {
    const name = cleanName(body.leader) || mine.leader_name;
    const pic = Number.isInteger(body.portrait) ? Math.max(0, Math.min(7, body.portrait as number)) : mine.portrait;
    await db().from("game_seats").update({ leader_name: name, portrait: pic }).eq("match_id", match.id).eq("iso3", mine.iso3);
  } else if (op === "settings") {
    if (match.host !== userId) throw new GameError("Only the host can change settings.", 403);
    const patch: Record<string, unknown> = {};
    if (SCENARIOS.includes(body.scenario as ScenarioId)) patch.scenario = body.scenario;
    if (["easy", "normal", "hard"].includes(body.difficulty as string)) patch.difficulty = body.difficulty;
    if (body.turnSeconds === 90 || body.turnSeconds === 150) patch.turn_seconds = body.turnSeconds;
    if (Object.keys(patch).length) await db().from("game_matches").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", match.id);
  } else if (op === "leave") {
    if (match.host === userId) throw new GameError("The host cannot leave the lobby. Close the tab instead.");
    await db().from("game_seats").update({ user_id: null, kind: "bot", leader_name: LEADERS[mine.iso3], portrait: SEATS.indexOf(mine.iso3) }).eq("match_id", match.id).eq("iso3", mine.iso3);
  } else if (op === "start") {
    if (match.host !== userId) throw new GameError("Only the host can start the match.", 403);
    await startMatch(match, seats);
  } else throw new GameError("Unknown action");
  await notify(match.id, op === "start" ? "started" : "lobby");
  return { ok: true };
}

async function startMatch(match: MatchRow, seats: SeatRow[]) {
  const world = createWorld(SEED_2026, { matchId: match.id, seed: Number(match.seed), scenario: match.scenario });
  const bots = seats.filter((s) => s.kind !== "human").map((s) => s.iso3);
  const plan = planBots(world, bots, match.difficulty);
  const { data, error } = await db()
    .from("game_matches")
    .update({ state: slim(world), plan, turn: 1, phase: "plan", deadline_at: deadline(match.turn_seconds, 1), updated_at: new Date().toISOString() })
    .eq("id", match.id)
    .eq("phase", "lobby")
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new GameError("The match has already started.", 409);
  await insertBotProposals(match.id, plan, seats);
}

async function insertBotProposals(matchId: string, plan: Plan, seats: SeatRow[]) {
  const humans = new Set(seats.filter((s) => s.kind === "human").map((s) => s.iso3));
  const rows = plan.proposals
    .filter((p) => p.status === "pending" && humans.has(p.to))
    .map((p) => ({ id: `${matchId.slice(0, 8)}-${p.id}`, match_id: matchId, turn: p.turn, from_iso3: p.from, to_iso3: p.to, body: { gives: p.gives, wants: p.wants, turns: p.turns }, status: "pending" }));
  if (rows.length) {
    const { error } = await db().from("game_proposals").upsert(rows);
    if (error) throw error;
  }
}

// ───────── the match view (what one player may see) ─────────

export async function view(matchId: string, userId: string) {
  const match = await getMatchBy("id", matchId);
  const seats = await getSeats(match.id);
  const mine = mySeat(seats, userId);
  if (!mine) throw new GameError("You are not in this match.", 403);
  const now = new Date().toISOString();
  await db()
    .from("game_seats")
    .update(mine.kind === "caretaker" ? { last_seen: now, kind: "human", empty_turns: 0 } : { last_seen: now })
    .eq("match_id", match.id)
    .eq("iso3", mine.iso3);

  const [{ data: orderRow }, { data: props }, { data: lastTurn }] = await Promise.all([
    db().from("game_orders").select("orders").eq("match_id", match.id).eq("turn", match.turn).eq("iso3", mine.iso3).maybeSingle(),
    db().from("game_proposals").select("*").eq("match_id", match.id).eq("turn", match.turn).or(`from_iso3.eq.${mine.iso3},to_iso3.eq.${mine.iso3}`),
    match.turn > 1 || match.phase === "ended"
      ? db().from("game_turns").select("record").eq("match_id", match.id).order("turn", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const proposals = ((props ?? []) as ProposalRow[]).map((r) => {
    const p = toProposal(r);
    const counterOf = r.body.counterOf;
    // an offer someone else sent me is in my inbox; a counter to my own offer comes back to me to decide
    const inbox = !counterOf && r.to_iso3 === mine.iso3 && r.from_iso3 !== mine.iso3;
    return { ...p, inbox, counterOf };
  });

  return {
    match: { id: match.id, code: match.code, host: match.host, phase: match.phase, turn: match.turn, scenario: match.scenario, difficulty: match.difficulty, turnSeconds: match.turn_seconds, deadlineAt: match.deadline_at, serverNow: now },
    seats: seats.map((s) => ({ iso3: s.iso3, kind: s.kind, leader: s.leader_name, portrait: s.portrait, locked: s.locked, you: s.user_id === userId, online: Date.now() - Date.parse(s.last_seen) < 20_000 })),
    me: mine.iso3,
    isHost: match.host === userId,
    world: match.state,
    orders: (orderRow?.orders as TurnOrders | undefined) ?? {},
    proposals,
    lastRecord: (lastTurn?.record as OnlineRecord | undefined) ?? null,
  };
}

// ───────── during a turn ─────────

async function planningSeat(matchId: string, userId: string) {
  const match = await getMatchBy("id", matchId);
  if (match.phase !== "plan") throw new GameError("The turn is not open for orders right now.", 409);
  const seats = await getSeats(match.id);
  const mine = mySeat(seats, userId);
  if (!mine) throw new GameError("You are not in this match.", 403);
  return { match, seats, mine };
}

export async function saveOrders(matchId: string, userId: string, orders: unknown) {
  const { match, mine } = await planningSeat(matchId, userId);
  if (mine.locked) throw new GameError("Your orders for this year are locked.", 409);
  const json = JSON.stringify(orders ?? {});
  if (json.length > 20_000) throw new GameError("Too many orders.");
  const o = JSON.parse(json) as TurnOrders;
  delete o.proposalsSent; // counted by the server from real proposals
  const { error } = await db().from("game_orders").upsert({ match_id: match.id, turn: match.turn, iso3: mine.iso3, orders: o, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { ok: true };
}

export async function setLock(matchId: string, userId: string, locked: boolean) {
  const { match, mine } = await planningSeat(matchId, userId);
  await db().from("game_seats").update({ locked, empty_turns: 0 }).eq("match_id", match.id).eq("iso3", mine.iso3);
  await notify(match.id, "lock", { iso3: mine.iso3, locked });
  if (locked) await resolve(match.id);
  return { ok: true };
}

export async function propose(matchId: string, userId: string, body: { to?: string; gives?: Term[]; wants?: Term[]; turns?: number; parentId?: string }) {
  const { match, seats, mine } = await planningSeat(matchId, userId);
  const world = match.state!;
  const to = body.to as Iso3;
  if (!SEATS.includes(to) || to === mine.iso3) throw new GameError("Choose another country.");
  const draft = { from: mine.iso3, to, gives: body.gives ?? [], wants: body.wants ?? [], turns: Number(body.turns) || 3 };
  const legal = proposalLegal(world, draft);
  if (legal !== true) throw new GameError(legal);
  const { data: existing } = await db().from("game_proposals").select("id, body, status, from_iso3, to_iso3").eq("match_id", match.id).eq("turn", match.turn);
  const rows = (existing ?? []) as ProposalRow[];
  // a counter to an offer I received is free; everything else costs a move
  const parent = body.parentId ? rows.find((r) => r.id === body.parentId && r.to_iso3 === mine.iso3 && r.from_iso3 === to) : undefined;
  const free = !!parent;
  if (!free) {
    const sent = rows.filter((r) => r.from_iso3 === mine.iso3 && !r.body.free && !r.body.counterOf).length;
    if (sent >= MAX_PROPOSALS_PER_TURN) throw new GameError("You have sent enough proposals this year.");
    // cards that no longer fit after proposals are dropped by the engine at resolve, with a reason
    if (sent >= world.countries[mine.iso3].pc) throw new GameError("No moves left for another proposal.");
  }
  const id = `${match.id.slice(0, 8)}-${match.turn}-${mine.iso3}-${to}-${rows.length}`;
  const row = { id, match_id: match.id, turn: match.turn, from_iso3: mine.iso3, to_iso3: to, body: { gives: draft.gives, wants: draft.wants, turns: draft.turns, parentId: parent?.id, free }, status: "pending" as const };
  const { error } = await db().from("game_proposals").insert(row);
  if (error) throw error;
  if (parent) await db().from("game_proposals").update({ status: "countered" }).eq("id", parent.id);

  // a bot (or a caretaker bot) answers at once
  const target = seats.find((s) => s.iso3 === to)!;
  if (target.kind !== "human") {
    const out = answerHumanProposal(world, { ...toProposal(row as ProposalRow), parentId: parent?.id });
    await db().from("game_proposals").update({ status: out[0].status }).eq("id", id);
    if (out[1]) {
      const c = out[1];
      await db().from("game_proposals").insert({ id: `${id}-c`, match_id: match.id, turn: match.turn, from_iso3: c.from, to_iso3: c.to, body: { gives: c.gives, wants: c.wants, turns: c.turns, parentId: id, counterOf: id, free: true }, status: "pending" });
    }
  }
  await notify(match.id, "proposal", { to });
  return { ok: true, id };
}

export async function answer(matchId: string, userId: string, pid: string, action: string) {
  const { match, mine } = await planningSeat(matchId, userId);
  const { data } = await db().from("game_proposals").select("*").eq("id", pid).eq("match_id", match.id).maybeSingle();
  const p = data as ProposalRow | null;
  if (!p || p.turn !== match.turn || p.status !== "pending") throw new GameError("That offer is no longer open.", 409);
  const isCounterToMe = !!p.body.counterOf && p.from_iso3 === mine.iso3;
  const isOfferToMe = !p.body.counterOf && p.to_iso3 === mine.iso3;
  if (!isCounterToMe && !isOfferToMe) throw new GameError("That offer is not yours to answer.", 403);
  const status = action === "accept" ? "accepted" : action === "reject" ? "rejected" : action === "counter" && isOfferToMe ? "countered" : null;
  if (!status) throw new GameError("Unknown answer");
  await db().from("game_proposals").update({ status }).eq("id", pid);
  await notify(match.id, "proposal", { to: p.from_iso3 });
  return { ok: true };
}

// ───────── resolving a turn ─────────

/** Resolve the current turn if every human has locked or the deadline has passed. Safe to call from anyone, any time. */
export async function resolve(matchId: string): Promise<{ resolved: boolean }> {
  const current = await getMatchBy("id", matchId);
  if (current.phase !== "plan") return { resolved: false };
  const { data: claimed, error } = await db().rpc("game_claim_turn", { p_match: matchId, p_turn: current.turn });
  if (error) throw error;
  const match = (claimed as MatchRow[] | null)?.[0];
  if (!match) return { resolved: false };
  try {
    await resolveClaimed(match);
    return { resolved: true };
  } catch (e) {
    await db().from("game_matches").update({ phase: "plan", deadline_at: deadline(match.turn_seconds, match.turn) }).eq("id", match.id);
    throw e;
  }
}

async function resolveClaimed(match: MatchRow) {
  const world = match.state!;
  const plan = match.plan ?? { orders: {}, proposals: [] };
  const seats = await getSeats(match.id);
  const [{ data: orderRows }, { data: propRows }] = await Promise.all([
    db().from("game_orders").select("iso3, orders").eq("match_id", match.id).eq("turn", match.turn),
    db().from("game_proposals").select("*").eq("match_id", match.id).eq("turn", match.turn),
  ]);
  const props = (propRows ?? []) as ProposalRow[];
  const byIso = new Map((orderRows ?? []).map((r) => [r.iso3 as Iso3, r.orders as TurnOrders]));

  const orders: Partial<Record<Iso3, TurnOrders>> = {};
  const seatUpdates: { iso3: Iso3; patch: Partial<SeatRow> }[] = [];
  for (const s of seats) {
    if (s.kind === "human") {
      const o = { ...(byIso.get(s.iso3) ?? {}) };
      o.proposalsSent = props.filter((p) => p.from_iso3 === s.iso3 && !p.body.free && !p.body.counterOf).length;
      orders[s.iso3] = o;
      const empty = !byIso.has(s.iso3) && !s.locked && o.proposalsSent === 0;
      const emptyTurns = empty ? s.empty_turns + 1 : 0;
      seatUpdates.push({ iso3: s.iso3, patch: { empty_turns: emptyTurns, locked: false, kind: emptyTurns >= 2 ? "caretaker" : "human" } });
    } else if (s.kind === "caretaker") {
      // planned with the bots when the seat was already away; otherwise the caretaker decides now
      if (!plan.orders[s.iso3]) orders[s.iso3] = decideTurn(world, s.iso3, match.difficulty, stream(world.seed, world.turn, `caretaker:${s.iso3}`)).orders;
      seatUpdates.push({ iso3: s.iso3, patch: { locked: false } });
    }
  }
  const accepted = props.filter((p) => p.status === "accepted").map(toProposal);
  const next = closeTurn(world, plan, orders, accepted);

  // what each human's own decisions did this year, against the same year without them
  const impact: Partial<Record<Iso3, Impact>> = {};
  for (const s of seats.filter((x) => x.kind === "human")) {
    const without = closeTurn(world, plan, { ...orders, [s.iso3]: {} }, accepted.filter((p) => p.from !== s.iso3 && p.to !== s.iso3));
    const a = next.countries[s.iso3];
    const b = without.countries[s.iso3];
    impact[s.iso3] = {
      growth: a.growth - b.growth,
      unemployment: a.unemployment - b.unemployment,
      inflation: a.inflation - b.inflation,
      stability: a.stability - b.stability,
      energy: (a.goods.energy.supplyRatio - b.goods.energy.supplyRatio) * 100,
      food: (a.goods.food.supplyRatio - b.goods.food.supplyRatio) * 100,
      treasury: a.treasury - b.treasury,
      power: (next.power[s.iso3].at(-1) ?? 0) - (without.power[s.iso3].at(-1) ?? 0),
    };
  }
  const record: OnlineRecord = { ...next.history.at(-1)!, impact };
  const { error: e1 } = await db().from("game_turns").upsert({ match_id: match.id, turn: match.turn, record });
  if (e1) throw e1;
  await db().from("game_proposals").update({ status: "expired" }).eq("match_id", match.id).eq("turn", match.turn).eq("status", "pending");
  for (const u of seatUpdates) await db().from("game_seats").update(u.patch).eq("match_id", match.id).eq("iso3", u.iso3);

  if (next.ended) {
    const st = standings(next);
    const results = SEATS.map((iso3) => ({ match_id: match.id, iso3, user_id: seats.find((s) => s.iso3 === iso3)?.user_id ?? null, score: leaderScore(next, iso3).total, power_rank: st.find((x) => x.iso3 === iso3)!.rank, won: st[0].iso3 === iso3 }));
    await db().from("game_results").upsert(results);
    await db().from("game_matches").update({ state: slim(next), plan: null, turn: next.turn, phase: "ended", deadline_at: null, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", match.id);
  } else {
    const fresh = await getSeats(match.id);
    const bots = fresh.filter((s) => s.kind !== "human").map((s) => s.iso3);
    const nextPlan = planBots(next, bots, match.difficulty);
    await db().from("game_matches").update({ state: slim(next), plan: nextPlan, turn: next.turn, phase: "plan", deadline_at: deadline(match.turn_seconds, next.turn), updated_at: new Date().toISOString() }).eq("id", match.id);
    await insertBotProposals(match.id, nextPlan, fresh);
  }
  await notify(match.id, "resolved", { turn: match.turn });
}

/** Backup for turns whose players all left: resolve every overdue turn (called by pg_cron, MULTIPLAYER §4.1). */
export async function tick() {
  const { data } = await db().from("game_matches").select("id").eq("phase", "plan").lt("deadline_at", new Date().toISOString()).limit(20);
  let n = 0;
  for (const m of data ?? []) if ((await resolve(m.id as string)).resolved) n++;
  return { resolved: n };
}
