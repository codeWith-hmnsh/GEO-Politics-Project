// Builds a run of ten questions and scores it. A daily run uses the date as its seed, so everyone plays the
// same questions that day; practice runs use a random seed.
import { stream } from "../engine/rng";
import { NEXT, NOW, THEN } from "./bank";
import { newsQuestions, shuffle } from "./news";
import type { Answer, BankQuestion, Era, Question, QuizCountry, QuizNews } from "./types";

export const PER_ERA: Record<Era, number> = { then: 3, now: 4, next: 3 };
export const RUN_LENGTH = PER_ERA.then + PER_ERA.now + PER_ERA.next;
/** Most "Now" questions come from the news when there is enough of it. */
export const NEWS_SHARE = 2;
export const TIME_MS = 20_000;

/** Today's seed, such as 20261020, in the player's own time zone. */
export function dailySeed(d = new Date()) {
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** "20 Oct" for a day seed. */
export function dayLabel(seed: number) {
  return new Date(Math.floor(seed / 10_000), Math.floor((seed % 10_000) / 100) - 1, seed % 100).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fromBank(q: BankQuestion, r: () => number): Question {
  const options = [q.right, ...q.wrong];
  const order = shuffle([0, 1, 2, 3], r);
  return {
    id: q.id,
    era: q.era,
    prompt: q.prompt,
    options: order.map((i) => options[i]),
    answer: order.indexOf(0),
    fact: q.fact,
    when: q.when,
    place: q.place,
    countries: q.countries ?? [],
    arc: q.arc,
  };
}

export function buildRun(seed: number, news: QuizNews[], countries: QuizCountry[]): Question[] {
  const r = stream(seed, 0, "quiz");
  const pick = (list: BankQuestion[], n: number) =>
    shuffle(list, r)
      .slice(0, n)
      .map((q) => fromBank(q, r));
  const fresh = countries.length ? newsQuestions(news, countries, NEWS_SHARE, r) : [];
  return [...pick(THEN, PER_ERA.then), ...fresh, ...pick(NOW, PER_ERA.now - fresh.length), ...pick(NEXT, PER_ERA.next)];
}

/** Streak bonus: ×1.5 from the third right answer in a row, ×2 from the fifth. */
export function multiplier(streak: number) {
  return streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
}

/** 100 for a right answer, up to 50 more for speed, times the streak bonus (counting this answer). */
export function points(correct: boolean, ms: number, streakBefore: number) {
  if (!correct) return 0;
  const speed = Math.round(50 * Math.max(0, 1 - ms / TIME_MS));
  return Math.round((100 + speed) * multiplier(streakBefore + 1));
}

export const TITLES: { min: number; title: string; line: string }[] = [
  {
    min: 10,
    title: "Statesman",
    line: "A perfect run. The world makes sense to you.",
  },
  {
    min: 8,
    title: "Ambassador",
    line: "You read the world like a seasoned diplomat.",
  },
  {
    min: 6,
    title: "Analyst",
    line: "Sharp. A few more runs and nothing will surprise you.",
  },
  {
    min: 4,
    title: "Reporter",
    line: "You know the big stories. The details come with practice.",
  },
  {
    min: 0,
    title: "Intern",
    line: "Everyone starts here. Every answer showed you something new.",
  },
];

export function titleFor(right: number) {
  return TITLES.find((t) => right >= t.min)!;
}

/** A spoiler-free result to share: one square per question, grouped by era. */
export function shareText(day: string, questions: Question[], answers: Answer[], score: number) {
  const right = answers.filter((a) => a.correct).length;
  const rows = (["then", "now", "next"] as Era[]).map((e) => questions.map((q, i) => (q.era === e ? (answers[i]?.correct ? "🟩" : "🟥") : "")).join(""));
  return `Then · Now · Next — ${day}\n${rows.join(" ")}\n${right}/${questions.length} · ${score.toLocaleString("en-US")} pts`;
}
