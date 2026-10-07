import "server-only";
import bordersData from "@/data/curated/borders.json";
import conflictsData from "@/data/curated/conflicts.json";
import crisesData from "@/data/curated/crises.json";
import orgsData from "@/data/curated/organizations.json";
import relationsData from "@/data/curated/relations.json";
import summitsData from "@/data/curated/summits.json";
import type { ApiEnvelope, NewsCluster } from "@/lib/schemas/news";
import { getNewsSnapshot } from "./news";

const STRIKE_WORDS = /\b(missile|missiles|drone|drones|airstrike|air strike|strike|strikes|shelling|bombed|bombing|rocket|rockets)\b/i;
const STRIKE_WINDOW_MS = 48 * 3600_000;

type Conflict = (typeof conflictsData.items)[number];

export type PulseConflict = Omit<Conflict, "keywords"> & {
  /** Strike arcs are shown only when 2+ trusted outlets reported strikes in the last 48 h. */
  strikesActive: boolean;
  news: Pick<NewsCluster, "id" | "title" | "url" | "source" | "publishedAt" | "sourceCount" | "verified">[];
};

export type Pulse = {
  conflicts: PulseConflict[];
  organizations: typeof orgsData.items;
  summits: typeof summitsData.items;
  borders: { hostile: typeof bordersData.hostile; disputed: typeof bordersData.disputed };
  crises: typeof crisesData.items;
  relations: typeof relationsData.items;
  editorialReviewPending: boolean;
};

function matchesConflict(c: Conflict, cluster: NewsCluster): boolean {
  const title = cluster.title.toLowerCase();
  return c.keywords.some((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(title));
}

/** Home layers: curated base data joined with the latest verified news (docs/ARCHITECTURE.md §7). */
export async function getPulse(): Promise<ApiEnvelope<Pulse>> {
  const snap = await getNewsSnapshot();
  const clusters = snap?.payload.clusters ?? [];
  const now = snap ? Date.parse(snap.asOf) : Date.now();

  const conflicts: PulseConflict[] = conflictsData.items.map(({ keywords, ...c }) => {
    const related = clusters.filter((cl) => cl.sections.includes("conflict") && matchesConflict({ ...c, keywords }, cl));
    const strikesActive = related.some(
      (cl) => cl.verified && STRIKE_WORDS.test(cl.title) && now - Date.parse(cl.publishedAt) < STRIKE_WINDOW_MS,
    );
    return {
      ...c,
      strikesActive,
      news: related.slice(0, 3).map(({ id, title, url, source, publishedAt, sourceCount, verified }) => ({
        id, title, url, source, publishedAt, sourceCount, verified,
      })),
    };
  });

  return {
    data: {
      conflicts,
      organizations: orgsData.items,
      summits: summitsData.items,
      borders: { hostile: bordersData.hostile, disputed: bordersData.disputed },
      crises: crisesData.items,
      relations: relationsData.items,
      editorialReviewPending: [conflictsData, orgsData, summitsData, bordersData, crisesData, relationsData].some((d) => d.needsEditorialReview),
    },
    asOf: snap?.asOf ?? null,
    stale: !snap || snap.origin === "seed",
    sources: ["Curated data (data/curated)", ...(snap ? ["Trusted news feeds"] : [])],
  };
}
