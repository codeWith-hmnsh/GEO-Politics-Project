import rules from "@/config/classifier.json";
import { SECTIONS, type Section } from "@/lib/schemas/news";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATTERNS: [Section, RegExp][] = SECTIONS.map((section) => {
  const words = (rules as unknown as Record<Section, string[]>)[section];
  return [section, new RegExp(`\\b(${words.map(escape).join("|")})\\b`, "i")];
});

const EXCLUDE = new RegExp(`\\b(${((rules as { _exclude?: string[] })._exclude ?? []).map(escape).join("|")})\\b`, "i");

/** Sport, entertainment and similar headlines that are not geopolitics. */
export function isExcluded(title: string): boolean {
  return EXCLUDE.test(title);
}

/** Sections a headline belongs to; `hint` (from the feed or GDELT query) is used when nothing matches. */
export function classify(title: string, hint?: string): Section[] {
  const found = PATTERNS.filter(([, re]) => re.test(title)).map(([s]) => s);
  if (found.length) return found;
  return hint && (SECTIONS as readonly string[]).includes(hint) ? [hint as Section] : [];
}
