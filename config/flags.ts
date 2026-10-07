// Feature flags (docs/ARCHITECTURE.md §10). Flip to true as each milestone ships.
export const flags = {
  /** Google photoreal "See the place" close-up (M3). */
  closeUp: false,
  /** Story tours (M3). */
  tours: false,
  /** Economy and Defense modes (M2). */
  economyMode: true,
  defenseMode: true,
  /** Energy and Diplomacy modes (M4). */
  energyMode: true,
  diplomacyMode: true,
  /** "Markets today" tab and market pills: turn on once a market-data provider key is set (BUILD-PLAN M1.3). */
  markets: false,
  /** Optional conflict data sources, once access tokens are granted. */
  ucdp: false,
  acled: false,
} as const;

export type FlagName = keyof typeof flags;
