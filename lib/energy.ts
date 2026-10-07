// Shared energy shapes for the ingest job and the app (client-safe).

export const MIX_KEYS = ["coal", "oil", "gas", "nuclear", "hydro", "solar", "wind", "other"] as const;
export type MixKey = (typeof MIX_KEYS)[number];

/** Shares in %. `basis` says whether they cover all primary energy or only electricity (more countries report the latter). */
export type EnergyMix = { year: number; basis: "energy" | "electricity" } & Record<MixKey, number>;
