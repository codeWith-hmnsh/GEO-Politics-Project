// UI state for Then · Now · Next (/play/quiz): intro → chapter → ask → reveal → … → end.
import { create } from "zustand";
import { sound } from "../sound";
import { buildRun, dailySeed, points } from "./run";
import type { Answer, Era, Question, QuizCountry, QuizNews } from "./types";

export type QuizPhase = "intro" | "chapter" | "ask" | "reveal" | "end";

interface Saved {
  best: number;
  /** Last daily run finished, as a seed (YYYYMMDD). */
  lastDay: number;
  /** Days in a row with a finished daily run. */
  days: number;
  played: number;
}

const KEY = "then-now-next";
const EMPTY: Saved = { best: 0, lastDay: 0, days: 0, played: 0 };

function load(): Saved {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return EMPTY;
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage is optional
  }
}

/** Was `prev` the day before `day`? Both are YYYYMMDD seeds. */
function dayBefore(prev: number, day: number) {
  const d = (n: number) => new Date(Math.floor(n / 10_000), Math.floor((n % 10_000) / 100) - 1, n % 100);
  return Math.round((d(day).getTime() - d(prev).getTime()) / 86_400_000) === 1;
}

interface QuizStore {
  phase: QuizPhase;
  daily: boolean;
  seed: number;
  questions: Question[];
  i: number;
  answers: Answer[];
  score: number;
  streak: number;
  bestStreak: number;
  /** Options hidden by the 50:50 on the current question. */
  hidden: number[];
  fiftyUsed: boolean;
  askedAt: number;
  saved: Saved;
  /** Today's day seed, read on the client after mount (never during render). */
  today: number;
  /** True when this run beat the saved best. */
  record: boolean;

  hydrate: () => void;
  start: (daily: boolean, news: QuizNews[], countries: QuizCountry[]) => void;
  ask: () => void;
  answer: (picked: number | null) => void;
  fifty: () => void;
  next: () => void;
  home: () => void;
}

export const useQuiz = create<QuizStore>((set, get) => ({
  phase: "intro",
  daily: true,
  seed: 0,
  questions: [],
  i: 0,
  answers: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  hidden: [],
  fiftyUsed: false,
  askedAt: 0,
  saved: EMPTY,
  today: 0,
  record: false,

  hydrate: () => set({ saved: load(), today: dailySeed() }),
  start: (daily, news, countries) => {
    const seed = daily ? dailySeed() : Math.floor(Math.random() * 2 ** 31);
    set({
      daily,
      seed,
      questions: buildRun(seed, news, countries),
      i: 0,
      answers: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      hidden: [],
      fiftyUsed: false,
      record: false,
      phase: "chapter",
    });
    sound.chime();
  },
  ask: () => set({ phase: "ask", askedAt: performance.now(), hidden: [] }),
  answer: (picked) => {
    const s = get();
    if (s.phase !== "ask") return;
    const q = s.questions[s.i];
    const ms = performance.now() - s.askedAt;
    const correct = picked === q.answer;
    const pts = points(correct, ms, s.streak);
    const streak = correct ? s.streak + 1 : 0;
    set({
      phase: "reveal",
      answers: [...s.answers, { picked, correct, ms, points: pts }],
      score: s.score + pts,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
    });
    if (correct) sound.chime();
    else sound.knock();
  },
  fifty: () => {
    const s = get();
    if (s.fiftyUsed || s.phase !== "ask") return;
    const q = s.questions[s.i];
    const wrong = [0, 1, 2, 3].filter((k) => k !== q.answer);
    const keep = wrong[Math.floor(Math.random() * wrong.length)];
    set({ fiftyUsed: true, hidden: wrong.filter((k) => k !== keep) });
    sound.flip();
  },
  next: () => {
    const s = get();
    const i = s.i + 1;
    if (i >= s.questions.length) {
      const saved = {
        ...s.saved,
        played: s.saved.played + 1,
        best: Math.max(s.saved.best, s.score),
      };
      if (s.daily && s.saved.lastDay !== s.seed) {
        saved.days = dayBefore(s.saved.lastDay, s.seed) ? s.saved.days + 1 : 1;
        saved.lastDay = s.seed;
      }
      save(saved);
      set({
        phase: "end",
        saved,
        record: s.score > s.saved.best && s.saved.played > 0,
      });
      sound.rank();
      return;
    }
    const era: Era = s.questions[i].era;
    set({
      i,
      phase: era !== s.questions[s.i].era ? "chapter" : "ask",
      askedAt: performance.now(),
      hidden: [],
    });
    sound.click();
  },
  home: () => set({ phase: "intro" }),
}));
