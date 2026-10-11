// Partner regions (docs4.0/GAME-DESIGN.md §3.4). Not players: they trade, take aid and lean toward helpers.
import type { Good, Iso3, RegionId } from "./types";

export interface RegionDef {
  id: RegionId;
  name: string;
  /** ISO3 codes tinted on the globe for the influence map. */
  countries: string[];
  needs: Good[];
  offers: Good[];
  /** Seats the region depends on; sanctioning them costs sway here. */
  dependsOn: Iso3[];
  /** Starting sway per seat (sums to ≤ 100). */
  sway0: Partial<Record<Iso3, number>>;
}

export const REGION_DEFS: Record<RegionId, RegionDef> = {
  EUR: {
    id: "EUR",
    name: "Europe",
    countries: ["DEU", "FRA", "ITA", "ESP", "POL", "NLD", "BEL", "SWE", "AUT", "CZE", "PRT", "GRC", "ROU", "HUN", "GBR", "NOR", "FIN", "DNK", "IRL", "CHE"],
    needs: ["energy"],
    offers: ["tech"],
    dependsOn: ["USA", "CHN"],
    sway0: { USA: 40, CHN: 10, RUS: 4, JPN: 5, IND: 3, SAU: 3 },
  },
  SEA: {
    id: "SEA",
    name: "Southeast Asia",
    countries: ["IDN", "VNM", "THA", "PHL", "MYS", "SGP", "MMR", "KHM", "LAO"],
    needs: ["energy", "tech"],
    offers: ["food"],
    dependsOn: ["CHN", "JPN", "USA"],
    sway0: { CHN: 30, JPN: 20, USA: 18, IND: 8, SAU: 3, RUS: 2 },
  },
  SAS: {
    id: "SAS",
    name: "South Asia",
    countries: ["PAK", "BGD", "LKA", "NPL", "AFG", "BTN", "MDV"],
    needs: ["energy", "food"],
    offers: [],
    dependsOn: ["IND", "CHN", "SAU"],
    sway0: { IND: 28, CHN: 22, USA: 10, SAU: 10, RUS: 3, JPN: 4 },
  },
  MENA: {
    id: "MENA",
    name: "Middle East & North Africa",
    countries: ["ARE", "IRN", "EGY", "IRQ", "QAT", "KWT", "OMN", "JOR", "ISR", "TUR", "DZA", "MAR", "TUN", "LBY", "SYR", "LBN", "YEM"],
    needs: ["food", "tech"],
    offers: ["energy"],
    dependsOn: ["SAU", "USA", "CHN"],
    sway0: { SAU: 25, USA: 20, CHN: 14, RUS: 12, IND: 5, JPN: 3 },
  },
  SSA: {
    id: "SSA",
    name: "Sub-Saharan Africa",
    countries: ["NGA", "KEN", "ETH", "ZAF", "GHA", "TZA", "AGO", "COD", "UGA", "SEN", "CIV", "CMR", "MOZ", "ZMB", "ZWE", "SDN", "MLI", "NER"],
    needs: ["food", "energy"],
    offers: ["energy"],
    dependsOn: ["CHN", "USA", "IND"],
    sway0: { CHN: 30, USA: 15, IND: 9, RUS: 6, SAU: 4, JPN: 5 },
  },
  LATAM: {
    id: "LATAM",
    name: "Latin America",
    countries: ["BRA", "MEX", "ARG", "CHL", "COL", "PER", "VEN", "ECU", "BOL", "URY", "PRY", "CUB", "GTM"],
    needs: ["tech"],
    offers: ["food", "energy"],
    dependsOn: ["USA", "CHN"],
    sway0: { USA: 35, CHN: 25, RUS: 3, IND: 4, JPN: 4, SAU: 2 },
  },
  CAS: {
    id: "CAS",
    name: "Central Asia",
    countries: ["KAZ", "UZB", "TKM", "KGZ", "TJK", "MNG", "AZE"],
    needs: ["tech"],
    offers: ["energy"],
    dependsOn: ["RUS", "CHN"],
    sway0: { RUS: 35, CHN: 30, USA: 6, IND: 4, JPN: 3, SAU: 2 },
  },
  OCE: {
    id: "OCE",
    name: "Oceania",
    countries: ["AUS", "NZL", "PNG", "FJI"],
    needs: ["tech"],
    offers: ["food", "energy"],
    dependsOn: ["USA", "CHN", "JPN"],
    sway0: { USA: 35, CHN: 15, JPN: 15, IND: 5, SAU: 1, RUS: 1 },
  },
};
