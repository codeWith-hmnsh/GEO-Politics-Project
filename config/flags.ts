// Feature flags (docs/ARCHITECTURE.md §10). Flip to true as each milestone ships.
export const flags = {
  /** Google photoreal "See the place" close-up (M3). */
  closeUp: false,
  /** Story tours (M3). */
  tours: false,
  /** Economy and Defense modes (M2). */
  economyMode: false,
  defenseMode: false,
  /** Energy and Diplomacy modes (M4). */
  energyMode: false,
  diplomacyMode: false,
  /** Optional conflict data sources, once access tokens are granted. */
  ucdp: false,
  acled: false,
} as const;

export type FlagName = keyof typeof flags;
