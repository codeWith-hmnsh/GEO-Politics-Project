// Then · Now · Next: a ten-question run about what happened, what is happening and what comes next.
// Pure data types: no React, no clock, no global randomness.

export const ERAS = ["then", "now", "next"] as const;
export type Era = (typeof ERAS)[number];

export type LatLng = [lat: number, lng: number];

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

/** A hand-written question: the first option is right, the other three are wrong. */
export interface BankQuestion {
  id: string;
  era: Era;
  prompt: string;
  right: string;
  wrong: [string, string, string];
  /** Shown once the player answers: what happened, or why that answer is right. */
  fact: string;
  /** The big label on the fact card, such as "1989". */
  when: string;
  place: Place;
  /** Countries lit on the globe after the answer. */
  countries?: string[];
  /** An arc drawn on the globe after the answer, from → to. */
  arc?: [LatLng, LatLng];
}

/** A question as played: options shuffled, plus what news questions carry. */
export interface Question {
  id: string;
  era: Era;
  prompt: string;
  /** A real headline with the answer blanked out (news questions only). */
  quote?: string;
  options: string[];
  answer: number;
  fact: string;
  when: string;
  place: Place;
  countries: string[];
  arc?: [LatLng, LatLng];
  source?: { name: string; url: string; headline: string; outlets: number };
}

/** The slice of a news cluster the quiz needs (see lib/schemas/news.ts). */
export interface QuizNews {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sections: string[];
  countries: string[];
  lat: number | null;
  lng: number | null;
  sourceCount: number;
  verified: boolean;
}

/** The country facts the news builder needs: a name and a centre. */
export interface QuizCountry {
  iso3: string;
  name: string;
  centroid: LatLng;
  area: number;
}

export interface Answer {
  picked: number | null;
  correct: boolean;
  ms: number;
  points: number;
}
