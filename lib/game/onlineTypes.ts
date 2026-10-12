// Shapes the multiplayer API returns (lib/game/server/service.ts `view`). Shared by server and browser.
import { TURN_SECONDS } from "./engine/rules";
import type { Iso3, Proposal, ScenarioId, TurnOrders, TurnRecord, WorldState } from "./engine/types";

/** Seconds in a multiplayer turn: 90 s rooms use the standard ramp; 150 s rooms add the same early-turn bonus. */
export const turnSecondsFor = (base: number, turn: number) => (base === 90 ? TURN_SECONDS(turn) : base + (turn === 1 ? 30 : turn === 2 ? 15 : 0));

export type ImpactRow = { growth: number; unemployment: number; inflation: number; stability: number; energy: number; food: number; treasury: number; power: number };

export interface SeatView {
  iso3: Iso3;
  kind: "human" | "bot" | "caretaker";
  leader: string;
  portrait: number;
  locked: boolean;
  you: boolean;
  online: boolean;
}

export interface MatchView {
  match: { id: string; code: string; host: string | null; phase: "lobby" | "plan" | "resolving" | "ended"; turn: number; scenario: ScenarioId; difficulty: "easy" | "normal" | "hard"; turnSeconds: number; deadlineAt: string | null; serverNow: string };
  seats: SeatView[];
  me: Iso3;
  isHost: boolean;
  world: WorldState | null;
  orders: TurnOrders;
  proposals: (Proposal & { inbox: boolean; counterOf?: string })[];
  lastRecord: (TurnRecord & { impact?: Partial<Record<Iso3, ImpactRow>> }) | null;
}

/** What the game store needs from the network while a multiplayer match is open. */
export interface NetOps {
  matchId: string;
  code: string;
  call: (op: string, body?: Record<string, unknown>) => Promise<unknown>;
  refresh: () => void;
}
