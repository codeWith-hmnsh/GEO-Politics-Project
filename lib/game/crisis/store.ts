// UI state for the Crisis Table (/play/crisis). The match itself lives in the pure engine; this store
// walks the player through one year at a time: brief → choose → home → lock → reveal → result.
import { create } from "zustand";
import type { Iso3 } from "../engine/types";
import { sound } from "../sound";
import { agendaOffer, newMatch, planBots, POLICY_PICKS, resolveYear, type BotPlan } from "./engine";
import type { ChatLine, Choice, MatchState, YearRecord } from "./types";

export type Phase = "intro" | "pick" | "agenda" | "brief" | "choose" | "home" | "locking" | "reveal" | "result" | "end";

interface CrisisStore {
  phase: Phase;
  me: Iso3;
  seed: number;
  offer: [string, string] | null;
  m: MatchState | null;
  prev: MatchState | null;
  plan: Partial<Record<Iso3, BotPlan>>;
  chat: ChatLine[];
  /** How many chat lines have arrived so far this year. */
  heard: number;
  choice: Choice | null;
  pledge: boolean;
  policies: string[];
  record: YearRecord | null;
  /** Bots that have locked during the locking beat. */
  locked: Iso3[];
  /** Seats whose card has flipped in the reveal (the globe colours them). */
  flipped: Iso3[];
  firstMatch: boolean;

  setPhase: (p: Phase) => void;
  pick: (me: Iso3) => void;
  confirmCountry: () => void;
  chooseAgenda: (id: string) => void;
  hear: () => void;
  setChoice: (c: Choice) => void;
  togglePledge: () => void;
  togglePolicy: (id: string) => void;
  lock: () => void;
  markLocked: (iso: Iso3) => void;
  flip: (iso: Iso3) => void;
  resolve: () => void;
  toResult: () => void;
  nextYear: () => void;
  restart: () => void;
}

const freshYear = { chat: [] as ChatLine[], heard: 0, choice: null, pledge: false, policies: [] as string[], record: null, locked: [] as Iso3[], flipped: [] as Iso3[] };

function seenBefore() {
  try {
    return localStorage.getItem("crisis-table-played") === "1";
  } catch {
    return false;
  }
}

export const useCrisis = create<CrisisStore>((set, get) => ({
  phase: "intro",
  me: "IND",
  seed: 1,
  offer: null,
  m: null,
  prev: null,
  plan: {},
  ...freshYear,
  firstMatch: true,

  setPhase: (phase) => set({ phase }),
  pick: (me) => {
    set({ me });
    sound.click();
  },
  confirmCountry: () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    set({ seed, offer: agendaOffer(seed, get().me), phase: "agenda", firstMatch: !seenBefore() });
  },
  chooseAgenda: (id) => {
    const { seed, me } = get();
    const m = newMatch(seed, me, id);
    const { plan, chat } = planBots(m);
    set({ m, prev: m, plan, ...freshYear, chat, phase: "brief" });
    sound.chime();
  },
  hear: () => set((s) => ({ heard: Math.min(s.chat.length, s.heard + 1) })),
  setChoice: (choice) => {
    set((s) => ({ choice, pledge: s.choice === choice ? s.pledge : false }));
    sound.place();
  },
  togglePledge: () => set((s) => ({ pledge: s.choice ? !s.pledge : false })),
  togglePolicy: (id) =>
    set((s) => {
      if (s.policies.includes(id)) return { policies: s.policies.filter((p) => p !== id) };
      sound.place();
      return { policies: [...s.policies, id].slice(-POLICY_PICKS) };
    }),
  lock: () => {
    if (!get().choice) return;
    set((s) => ({ phase: "locking", locked: [], heard: s.chat.length }));
    sound.lock();
  },
  markLocked: (iso) => set((s) => ({ locked: [...s.locked, iso] })),
  flip: (iso) => set((s) => ({ flipped: [...s.flipped, iso] })),
  resolve: () => {
    const { m, choice, pledge, policies, plan } = get();
    if (!m || !choice) return;
    const { next, record } = resolveYear(m, { choice, pledge: pledge ? choice : undefined, policies }, plan);
    set({ prev: m, m: next, record, flipped: [], phase: "reveal" });
  },
  toResult: () => set({ phase: "result" }),
  nextYear: () => {
    const { m } = get();
    if (!m) return;
    if (m.ended) {
      try {
        localStorage.setItem("crisis-table-played", "1");
      } catch {
        // storage is optional
      }
      set({ phase: "end" });
      return;
    }
    const { plan, chat } = planBots(m);
    set({ prev: m, plan, ...freshYear, chat, phase: "brief", firstMatch: false });
  },
  restart: () => set({ phase: "pick", m: null, prev: null, plan: {}, ...freshYear }),
}));
