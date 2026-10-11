// Cause records and Why chains (docs4.0/SYSTEMS.md §9).
import type { Cause, Iso3 } from "./types";

const THRESHOLD = 0.05;

export class CauseLog {
  readonly items: Cause[] = [];
  private n = 0;
  constructor(private readonly turn: number) {}

  /** Record a change and return its id. Small changes are kept too, so chains stay linked; `top` hides them. */
  add(
    iso3: Iso3,
    field: string,
    delta: number,
    label: string,
    opts: { actor?: Cause["actor"]; sourceRef?: string; parent?: string } = {},
  ): string {
    const id = `${this.turn}:${this.n++}`;
    this.items.push({ id, field: `${iso3}.${field}`, delta: Math.round(delta * 1000) / 1000, label, ...opts });
    return id;
  }

  /** Top visible contributors to a field this turn, largest first. */
  top(iso3: Iso3, field: string, n = 3): Cause[] {
    return this.items
      .filter((c) => c.field === `${iso3}.${field}` && Math.abs(c.delta) >= THRESHOLD)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, n);
  }
}

/** Walk parents up to the root move. Returns the chain from root to the given cause. */
export function whyChain(causes: Cause[], causeId: string): Cause[] {
  const byId = new Map(causes.map((c) => [c.id, c]));
  const chain: Cause[] = [];
  let cur = byId.get(causeId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    chain.unshift(cur);
    seen.add(cur.id);
    cur = cur.parent ? byId.get(cur.parent) : undefined;
  }
  return chain;
}
