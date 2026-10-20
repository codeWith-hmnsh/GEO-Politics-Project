// "Now" questions from the live news: a real headline with its country blanked out, and four countries to
// choose from (the right one plus three of its neighbours, so the map itself is part of the puzzle).
import type { LatLng, Question, QuizCountry, QuizNews } from "./types";

export const BLANK = "▢▢▢";

/** Friendlier names than the map file uses. */
const DISPLAY: Record<string, string> = {
  USA: "United States",
  COD: "DR Congo",
  COG: "Congo",
  CAF: "Central African Republic",
  BIH: "Bosnia and Herzegovina",
  SSD: "South Sudan",
  DOM: "Dominican Republic",
  CIV: "Côte d'Ivoire",
  MKD: "North Macedonia",
  SWZ: "Eswatini",
  PSE: "Palestine",
  CZE: "Czechia",
};

/** Words that give a country away: demonyms, capitals and nicknames the name alone does not cover. */
const ALIASES: Record<string, string[]> = {
  USA: ["us", "u.s", "u.s.", "america", "american", "americans", "washington", "trump", "white house", "pentagon"],
  GBR: ["uk", "u.k", "u.k.", "britain", "british", "briton", "britons", "england", "english", "london", "scotland", "wales"],
  CHN: ["chinese", "beijing", "xi"],
  RUS: ["moscow", "kremlin", "putin"],
  UKR: ["kyiv", "zelensky", "zelenskyy"],
  ISR: ["jerusalem", "netanyahu", "idf"],
  PSE: ["palestin", "gaza", "west bank", "hamas"],
  FRA: ["french", "paris", "macron"],
  DEU: ["german", "berlin"],
  JPN: ["japanese", "tokyo"],
  IND: ["delhi", "modi"],
  PAK: ["islamabad"],
  IRN: ["tehran", "persian"],
  SAU: ["riyadh", "saudi"],
  TUR: ["turkish", "türkiye", "turkiye", "ankara", "erdogan"],
  KOR: ["korea", "seoul"],
  PRK: ["korea", "pyongyang"],
  NLD: ["dutch", "netherlands"],
  AFG: ["afghan", "kabul", "taliban"],
  EGY: ["egyptian", "cairo"],
  COD: ["congo", "congolese", "kinshasa"],
  COG: ["congo", "congolese"],
  AUS: ["australian", "canberra"],
  NZL: ["zealand", "kiwi"],
  YEM: ["houthi", "houthis", "aden", "sanaa"],
  SYR: ["syrian", "damascus"],
  IRQ: ["iraqi", "baghdad"],
  ETH: ["ethiopian", "addis"],
  CAN: ["canadian", "ottawa"],
  BRA: ["brazilian", "brasilia"],
  ARG: ["argentine", "argentinian", "buenos aires"],
  POL: ["polish", "pole", "poles", "warsaw"],
  KEN: ["kenyan", "nairobi"],
  BGD: ["bangladeshi", "dhaka"],
  MCO: ["monaco", "monegasque"],
  DJI: ["djibouti"],
  PHL: ["filipino", "philippine", "manila"],
  TWN: ["taiwanese", "taipei"],
  VNM: ["vietnamese", "hanoi"],
  ESP: ["spanish", "madrid"],
  ITA: ["italian", "rome"],
  MEX: ["mexican"],
};

/** Grim headlines make poor quiz material; skip them. */
const SKIP = /\b(kill\w*|dead|deadly|death\w*|die[sd]?|dying|genocide|massacre\w*|rape\w*|victim\w*|mourn\w*|children|bodies|suicide|casualt\w*)\b/i;

export function displayName(c: Pick<QuizCountry, "iso3" | "name">) {
  return DISPLAY[c.iso3] ?? c.name;
}

/** Map areas that are not independent countries; never offered as a wrong answer. */
const NOT_A_STATE = new Set(["ATA", "ATF", "FLK", "GRL", "NCL", "PRI", "ESH", "XKX", "XNC", "XSL"]);

/**
 * The feed sometimes loses curly quotes to a replacement character. Apostrophes ("Israel's", "don't") and
 * quote marks at word edges come back as plain quotes; a lost letter inside a word stays broken, and the
 * question builder skips that headline.
 */
export function cleanTitle(t: string) {
  return t
    .replace(/(?<=\p{L})\uFFFD(?=(s|t|re|ll|ve|d|m)\b)/gu, "'")
    .replace(/\uFFFD(?!\p{L})|(?<!\p{L})\uFFFD/gu, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words for a country: its name (or the stem of a one-word name, which catches "Iranian", "Russia's"), plus aliases. */
function giveaways(c: QuizCountry) {
  const name = displayName(c).toLowerCase();
  const words = [name, ...(ALIASES[c.iso3] ?? [])];
  if (!name.includes(" ") && name.length >= 4) words.push(name.slice(0, Math.min(5, name.length)));
  return words;
}

/** Blanks out every word that names one of `isos`. */
export function mask(title: string, isos: string[], byIso: Map<string, QuizCountry>) {
  let out = title;
  const words = isos.flatMap((i) => (byIso.has(i) ? giveaways(byIso.get(i)!) : [])).sort((a, b) => b.length - a.length);
  for (const w of words) {
    // a stem matches the start of a word ("iran" → "Iranian"); a full alias must match a whole word
    const stem = !w.includes(" ") && w.length <= 5 && !ALIASES_FLAT.has(w);
    const re = new RegExp(`(?<![\\p{L}])${escape(w)}${stem ? "[\\p{L}'’]*" : "(?![\\p{L}])(?:'s|’s)?"}`, "giu");
    out = out.replace(re, BLANK);
  }
  return out.replace(new RegExp(`(${escape(BLANK)}[\\s-]*){2,}`, "g"), `${BLANK} `).trim();
}
const ALIASES_FLAT = new Set(Object.values(ALIASES).flat());

const km = (a: LatLng, b: LatLng) => {
  const r = Math.PI / 180;
  const s = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s));
};

/** Three plausible wrong countries: big enough to know, near the right one, not in the story. */
export function neighbours(answer: QuizCountry, all: QuizCountry[], exclude: string[], r: () => number): QuizCountry[] {
  const pool = all
    .filter((c) => c.area >= 5 && !NOT_A_STATE.has(c.iso3) && !exclude.includes(c.iso3) && c.iso3 !== answer.iso3)
    .sort((a, b) => km(a.centroid, answer.centroid) - km(b.centroid, answer.centroid))
    .slice(0, 7);
  const out: QuizCountry[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

/** How many of the best headlines a run draws from, so practice runs do not repeat the same two. */
const POOL = 8;

/** Up to `n` news questions, drawn from the best-sourced political headlines, one per country. */
export function newsQuestions(news: QuizNews[], countries: QuizCountry[], n: number, r: () => number): Question[] {
  const byIso = new Map(countries.map((c) => [c.iso3, c]));
  const seen = new Set<string>();
  const pool: {
    item: QuizNews;
    answer: QuizCountry;
    title: string;
    quote: string;
  }[] = [];
  const ranked = [...news].sort((a, b) => Number(b.verified) - Number(a.verified) || Number(b.sections.length > 0) - Number(a.sections.length > 0) || b.sourceCount - a.sourceCount || b.publishedAt.localeCompare(a.publishedAt));
  for (const item of ranked) {
    if (pool.length >= POOL) break;
    const iso = item.countries[0];
    const answer = iso ? byIso.get(iso) : undefined;
    const title = cleanTitle(item.title);
    if (!answer || seen.has(iso) || title.includes("\uFFFD") || SKIP.test(title) || title.length < 30 || title.length > 150) continue;
    const quote = mask(title, item.countries, byIso);
    const blanks = quote.split(BLANK).length - 1;
    const words = quote
      .replaceAll(BLANK, " ")
      .split(/\s+/)
      .filter((w) => /\p{L}{2}/u.test(w)).length;
    // one to three blanks, and enough words left to reason from
    if (blanks === 0 || blanks > 3 || words < 5) continue;
    seen.add(iso);
    pool.push({ item, answer, title, quote });
  }
  const out: Question[] = [];
  for (const { item, answer, title, quote } of shuffle(pool, r)) {
    if (out.length >= n) break;
    const iso = answer.iso3;
    const wrong = neighbours(answer, countries, item.countries, r);
    if (wrong.length < 3) continue;
    const options = [answer, ...wrong].map(displayName);
    const order = shuffle([0, 1, 2, 3], r);
    const date = new Date(item.publishedAt);
    out.push({
      id: `news-${item.id}`,
      era: "now",
      prompt: "This was in the news. Which country is it about?",
      quote,
      options: order.map((i) => options[i]),
      answer: order.indexOf(0),
      fact: title,
      when: Number.isNaN(date.getTime()) ? "In the news" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      place: {
        name: displayName(answer),
        lat: item.lat ?? answer.centroid[0],
        lng: item.lng ?? answer.centroid[1],
      },
      countries: [iso],
      source: {
        name: item.source,
        url: item.url,
        headline: title,
        outlets: item.sourceCount,
      },
    });
  }
  return out;
}

export function shuffle<T>(list: T[], r: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
