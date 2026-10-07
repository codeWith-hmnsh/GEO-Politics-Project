# Geo-Politics 1.0 — Data Sources & News Pipeline

| Field | Value |
|---|---|
| Version | 2.0 |
| Date | 2026-10-07 |
| Related | [PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) |

> Limits and access rules change. Every limit below was checked in October 2026 where possible; items marked **(verify)** must be confirmed on sign-up. All calls run **server-side** (ingest jobs), never from the browser — this protects keys and keeps us inside free limits.

---

## 1. The honest truth: one API cannot do everything

There is no single free API that gives wars, relations, economy, defense and news together. The plan uses:

1. **One live news/event backbone** — GDELT (free, no key, updates every 15 minutes, every country).
2. **Two live news supplements** — trusted-outlet RSS feeds + The Guardian Open Platform (+ NewsData.io as backfill).
3. **Official statistics APIs** — IMF, World Bank, UN Comtrade, OWID / Ember / EIA.
4. **Curated datasets we maintain** — for things no free API provides (relations baseline, conflict list, summits calendar, nuclear status, capability inventory, chokepoints). Each curated file has sources and a change log.

Things that have **no free live API** (be honest in UI):

| Thing | How we handle it |
|---|---|
| Missile / drone trajectories | Symbolic arcs from attacker territory to reported target area, triggered by trusted news in last 48 h. UI label: "Symbolic — based on reports". |
| Country-to-country "relation" | Computed score (alliances + UN votes + news tone) + curated baseline + editorial review. Basis shown to user. |
| Air / land / sea inventories | Curated yearly dataset from public sources. Capability Index labelled "Estimate". |
| Summit calendar | Curated `summits.json` + GDELT detection of summit coverage. |
| Economic crisis list | Curated, informed by IMF programme status and news. |

## 2. Source map — by feature

### 2.1 News & events (all sections)

| Source | What it gives | Auth / cost | Limits | Cadence | Use |
|---|---|---|---|---|---|
| **GDELT DOC 2.0 API** `api.gdeltproject.org/api/v2/doc/doc` | Articles matching keyword / theme / country / domain filters; modes `artlist`, `timelinevol`, `timelinetone` | Free, no key | Polite use: ~1 request per 5 s (verify) | Updates every 15 min | **Primary** headlines per section and per country; tone timelines for relations |
| **GDELT GEO 2.0 API** `api.gdeltproject.org/api/v2/geo/geo` | Geolocated mention points (GeoJSON) for a query | Free, no key | Same as above | 15 min | Hotspot coordinates, strike-report locations |
| **GDELT 2.0 Events (raw 15-min files)** `data.gdeltproject.org/gdeltv2/lastupdate.txt` | CAMEO-coded events with actor countries, Goldstein score, tone, lat/lng | Free, no key | Bandwidth only | 15 min | Diplomacy events (visits, agreements), cooperation/conflict between country pairs |
| **Trusted-outlet RSS** (BBC World, Al Jazeera, DW, France 24, NHK World, UN News, The Hindu, etc.) | Headlines + links from the outlet itself | Free | Fair use, cache ≥ 10 min | Real-time | **Primary-2**: fresh headlines from verified publishers; matched to GDELT clusters |
| **The Guardian Open Platform** `content.guardianapis.com` | Full metadata + section tags (world, business, …) | Free developer key | ~5,000 calls/day, non-commercial on dev tier **(verify)** | Real-time | Supplement for world / business / defence sections |
| **ReliefWeb API** (UN OCHA) | Humanitarian and conflict situation reports | Free, register an `appname` **(verify)** | Generous | Daily | Conflict cards: casualty / displacement context |
| **NewsData.io** | Multi-source news by country + category | Free key | 200 credits/day; free tier may be delayed **(verify)** | — | Backfill for countries with thin coverage |

Rejected for MVP: **NewsAPI.org** (free plan is development-only), **GNews** (free plan non-commercial and delayed), **Mediastack** (100 calls/month).

### 2.2 Wars & conflicts (Home layer 1)

| Source | Gives | Auth | Cadence | Use |
|---|---|---|---|---|
| **Curated `conflicts.json`** | Conflict id, name, parties, start date, type, status, centroid, intensity tier, "why it matters", tour id | Ours | Reviewed weekly | Base list of hotspots |
| **GDELT DOC + GEO** | 7-day coverage volume, strike reports (`missile OR airstrike OR drone strike` + place) | Free | 15 min | Intensity adjustment, arc triggers, latest news |
| **UCDP API** (GED Candidate, monthly) | Geocoded violent events, fatalities | Free, **access token required since Feb 2026** (email request; header `x-ucdp-access-token`) | Monthly | Casualty estimates, event map (P1) |
| **ACLED** | Event-level conflict + protest data | Free registered account; API access depends on tier (myACLED) | Weekly | Precision layer if access granted (P2) |
| **ReliefWeb** | Situation reports | Free | Daily | Context in conflict card |

### 2.3 Alliances & summits (Home layer 2, Diplomacy mode)

| Source | Gives | Auth | Cadence | Use |
|---|---|---|---|---|
| **Wikidata SPARQL** `query.wikidata.org` | Organisation memberships (`P463`), heads of state (`P35`) / government (`P6`), government type | Free, no key | Live (cache 7 days) | Membership lists, panel header |
| **Curated `organizations.json`** | Org id, glyph, colour, HQ coordinates, purpose (2 lines), members (validated against Wikidata) | Ours | Monthly | Org chips |
| **Curated `summits.json`** | Name, host city, dates, members, agenda | Ours | Monthly + ad hoc | Summit beacons |
| **GDELT DOC** | Summit coverage (`"<summit name>"`) | Free | 15 min | Summit live news, "happening now" confirmation |

### 2.4 Economy (Home layer 3, Economy mode)

| Source | Gives | Auth | Cadence | Use |
|---|---|---|---|---|
| **IMF DataMapper API** `imf.org/external/datamapper/api/v1/` | `NGDPD` GDP USD, `NGDP_RPCH` real growth, `PCPIPCH` inflation, `LUR` unemployment, `GGXWDG_NGDP` gov debt % GDP — with current-year forecasts | Free, no key | WEO: April + October | **Primary** for the 4 choropleth metrics |
| **World Bank Indicators API** `api.worldbank.org/v2/` | History for sparklines, youth unemployment `SL.UEM.1524.ZS`, external debt `DT.DOD.DECT.CD` | Free, no key | Annual / quarterly | Sparklines, gaps not in IMF |
| **World Bank IDS** (source 6) | External debt by creditor (multilateral, bilateral counterpart) | Free | Annual | "Who lends to whom" arcs |
| **UN Comtrade API** | Bilateral trade by partner | Free key; free tier ~500 calls/day **(verify)** | Monthly / annual | Top 5 export/import partners + arcs |
| **Market quotes provider (to choose)** | Daily index close for 6–8 markets | Free key | Daily | Home market pills and Markets card. **Stooq is no longer usable** (bot check added, found 2026-10-07); candidates: Twelve Data or Alpha Vantage free tiers — confirm index coverage on sign-up |
| **ExchangeRate-API open access** `open.er-api.com` | Daily rates, ~160 currencies | Free, no key, attribution required | Daily | Currency vs USD |
| **Curated `crises.json` + `imf_programs.json`** | Countries in crisis, active IMF arrangements | Ours (from IMF lending pages) | Monthly | ⚠ markers, "active IMF programme" |
| **AidData Chinese Development Finance** | Chinese official loans by country | Free dataset | Static (per release) | Creditor breakdown includes China (P1) |

### 2.5 Defense (Defense mode)

| Source | Gives | Auth | Cadence | Use |
|---|---|---|---|---|
| **World Bank API (SIPRI-sourced)** | `MS.MIL.XPND.CD` spending USD, `MS.MIL.XPND.GD.ZS` % GDP, `MS.MIL.TOTL.P1` personnel, `MS.MIL.MPRT.KD` arms imports TIV | Free | Annual | **Primary** for spending + personnel |
| **SIPRI Military Expenditure Database** (xlsx) | Latest year spending (newer than World Bank) | Free download | Annual (April) | Override latest year |
| **SIPRI Arms Transfers Database** (trade register CSV export) | Supplier → recipient transfers (TIV) | Free download | Annual (March) | Arms arcs, top suppliers |
| **Curated `nuclear.json`** | 9 nuclear-armed states, warhead estimates, delivery legs, NPT status, nuclear-sharing hosts | Ours, from FAS Status of World Nuclear Forces + SIPRI Yearbook | Annual | ☢ layer |
| **Curated `capability.json`** | Inputs for Air / Land / Sea index: combat aircraft, helicopters, tanks, artillery, major surface combatants, submarines, carriers | Ours, from cited public sources (government publications, sourced reference lists). IISS Military Balance is paid and **must not** be copied. | Annual | Capability Index |
| **Wikidata + curated `alliances.json`** | Military alliances (NATO, CSTO, bilateral defence pacts) | Free / ours | Monthly | Alliance outlines |

### 2.6 Energy & resources (Energy mode)

| Source | Gives | Auth | Cadence | Use |
|---|---|---|---|---|
| **Our World in Data energy dataset** (GitHub CSV, CC BY) | Energy mix, production, consumption by fuel | Free, no key | Annual | Mix bar, clean-% choropleth |
| **Ember API** | Monthly electricity generation by source | Free key | Monthly | Recent electricity mix (P1) |
| **EIA Open Data API v2** | International oil / gas production, reserves | Free key | Monthly / annual | Oil & gas choropleth |
| **UN Comtrade** (HS 2709 crude, 2711 gas) | Energy import partners | Free key | Annual | Supply arcs |
| **USGS Mineral Commodity Summaries** | Production share of lithium, cobalt, rare earths, nickel | Free, public domain | Annual (January) | Minerals choropleth |
| **Curated `chokepoints.json`** | 6 chokepoints, coordinates, oil/LNG share (from EIA chokepoint reports) | Ours | Annual + news | Amber markers |

### 2.7 Diplomacy (Diplomacy mode, Home relations)

| Source | Gives | Auth | Cadence | Use |
|---|---|---|---|---|
| **UNGA voting data** (Voeten et al., Harvard Dataverse) | Roll-call votes by country | Free download | Annual | Voting alignment |
| **GDELT Events** (CAMEO 03–05 cooperation, 11–20 conflict) | Visits, agreements, threats between pairs | Free | 15 min | Recent diplomacy beacons, relation score input |
| **Curated `sanctions.json`** | Sanctioning party → target, programme, year — from UN Security Council, EU Sanctions Map, US OFAC programme list | Ours | Monthly | Sanctions arcs |
| **Curated `relations_baseline.json`** | Pair, status, basis text, last reviewed | Ours | Weekly review | Relation colours (see [ARCHITECTURE.md §5](ARCHITECTURE.md)) |
| **Curated `hostile_borders.json`** | Border segments and LoC lines marked hostile | Ours | Monthly | Home red borders |

### 2.8 Base map and country metadata

| Source | Gives | Auth | Use |
|---|---|---|---|
| **Natural Earth** (public domain) | Admin-0 polygons (1:50m, 1:110m), disputed areas, point-of-view variants (e.g. India POV) | Free | Country shapes, disputed hatch |
| **REST Countries v3.1** | Capital, population, region, borders, currency, flag | Free, no key | Panel header, neighbour list |
| **NASA Visible Earth** (Blue Marble, Black Marble) | Day / night Earth textures. The prototype uses copies shipped with the `three-globe` examples (`earth-blue-marble.jpg`, `earth-night.jpg`, `earth-topology.png`, `earth-water.png`) | Free, public domain (NASA) | Globe surface, relief, water glint, city lights |
| **Cloud texture** | Global cloud cover image (prototype uses the `three-globe` example `clouds.png`) | **Licence to verify before production**; replace with NASA Blue Marble clouds if unclear | Cloud layers |
| **Natural Earth admin-1** (public domain) | State / province boundaries and names | Free | Zoom-level state boundaries. The prototype loads per-country files from the `echarts-countries-js` npm package; the build uses Natural Earth admin-1 instead |
| **Google Maps Platform — Photorealistic 3D Maps** (`gmp-map-3d`) | Photoreal city close-ups with `flyCameraTo` / `flyCameraAround` | API key + billing account; Enterprise-tier SKU with small monthly free cap **(verify current cap)** | Optional "See the place" close-up only |

## 3. Trusted news policy ("authenticated news")

### 3.1 Source tiers

| Tier | Who | Rule |
|---|---|---|
| **Tier 1** | Wire services and public-service broadcasters: Reuters, AP, AFP, BBC, DW, France 24, NHK World, ABC (AU), CBC, UN News | Can trigger globe events alone if 2 Tier-1 outlets agree |
| **Tier 2** | Major newspapers / networks with corrections policies: The Guardian, Al Jazeera English, The Hindu, Indian Express, Hindustan Times, Nikkei Asia, SCMP, Le Monde, El País, NPR, Washington Post, NYT, FT, The Economist, Bloomberg | Shown in rails; counts toward the 2-source rule |
| **Tier 3** | Other reputable national outlets | Shown in country rails only, never triggers globe events |
| **State-affiliated** | Outlets under direct state editorial control (e.g. RT, CGTN, PressTV, Xinhua) | Excluded from MVP rails. P2: optional "Other perspectives" section, always labelled. |
| **Blocked** | Content farms, unverified blogs, social media | Never shown |

The allowlist lives in `config/sources.json` (domain → tier, country, language). Change requires review.

### 3.2 Rules

1. **2-source rule** — a globe event (new hotspot, strike arc, summit "now", diplomacy beacon) needs ≥ 2 independent Tier-1/2 sources within 24 h.
2. **Headline + link only** — never store or display article body text. Show source name, time, and link out.
3. **Attribution** — every item shows outlet name; every data value shows dataset name and year.
4. **Clustering** — articles about the same event (title similarity + same countries + 6 h window) collapse into one item with "N sources".
5. **Language** — MVP English only; GDELT `sourcelang:english`.
6. **Corrections** — if a story is later retracted by its outlet, item is removed on next ingest.

## 4. News classification (which section a headline belongs to)

Step 1 — GDELT theme filters (examples; confirm names against the GDELT GKG theme lookup list):

| Section | GDELT themes / query terms |
|---|---|
| Conflict | `ARMEDCONFLICT`, `MILITARY`, `KILL`, `TERROR`, terms: airstrike, missile, shelling, offensive, ceasefire |
| Alliances & summits | terms: summit, NATO, BRICS, G20, G7, ASEAN, SCO, QUAD, "joint statement" |
| Economy | `ECON_*` themes (e.g. `ECON_INFLATION`), terms: GDP, inflation, IMF, tariff, central bank, recession, trade deal |
| Defense | `MILITARY`, terms: defence budget, arms deal, fighter jet, warship, exercise, nuclear test |
| Energy | `ENV_OIL`, `ENV_NATURALGAS`, terms: OPEC, pipeline, LNG, Strait of Hormuz, lithium, rare earth |
| Diplomacy | terms: sanctions, ambassador, visit, talks, treaty, UN Security Council, expelled |

Step 2 — keyword rules on the title as tie-breaker (`config/classifier.json`).

Step 3 (P2, optional) — small LLM classification + one-line "why it matters" draft for Daily Brief, **always human-reviewed before publish**. Not required for MVP; keeps stack free.

Country tagging: GDELT `sourcecountry` is the *publisher's* country, not the story's. Use GDELT GEO / location fields + country-name matching on the title to tag the story's countries.

## 5. Fetch schedule and budget

> **Status 2026-10-07 (M1.3):** the news job runs on trusted RSS feeds (13 feeds) plus GDELT. During development GDELT answered HTTP 429 for every request from the dev machine, so RSS carries the load and GDELT is used whenever it responds. The job never fails because of GDELT.

| Job | Sources | Interval | Calls per run | Calls per day | Free limit |
|---|---|---|---|---|---|
| `news-global` | GDELT DOC (6 sections) + RSS (~15 feeds) | 15 min | 6 + 15 | ~2,000 | GDELT no hard cap (spaced 5 s); RSS fair use |
| `news-country` | GDELT DOC for top 60 countries × section rotation | 60 min | 60 | 1,440 | OK |
| `guardian` | Guardian search (world, business) | 30 min | 2 | 96 | ≤ 5,000 |
| `newsdata-backfill` | NewsData.io for thin countries | 3 h | ≤ 20 | ≤ 160 credits | 200 credits |
| `conflicts` | GDELT GEO strike queries per conflict | 30 min | ~15 | 720 | OK |
| `events-diplomacy` | GDELT Events 15-min file | 15 min | 1 file | 96 files | OK |
| `markets` | Stooq | daily after close (per region) | 8 | 8 | OK |
| `economy` | IMF DataMapper + World Bank | daily | ~12 | 12 | OK |
| `trade` | UN Comtrade | weekly | ~200 (rotating countries) | — | ≤ 500/day |
| `defense`, `energy`, `diplomacy-static` | World Bank, OWID, EIA, Ember | weekly | < 50 | — | OK |
| `metadata` | Wikidata, REST Countries | weekly | ~10 | — | OK |

## 6. Map boundaries and legal notes

- Natural Earth default shows **de facto** control lines with disputed areas marked. Show disputed areas with a hatch pattern and a tooltip "Disputed — claimed by X and Y".
- **Decision (2026-10-07):** use the de facto view as in the approved prototype. Maps shown in India that differ from India's official boundaries can draw legal complaints; revisit before a public launch in India (Natural Earth also ships an India point-of-view file).
- Do not use official organisation logos (NATO, EU, UN) as globe symbols; use simplified neutral glyphs + names.
- Keep a `/sources` page listing every dataset, licence and attribution string (World Bank CC BY 4.0, OWID CC BY, Natural Earth public domain, NASA public domain, ExchangeRate-API attribution, Google Maps attribution when close-up is shown).

## 7. Keys and sign-ups checklist

| Service | Needs | Owner action |
|---|---|---|
| GDELT | Nothing | — |
| IMF, World Bank, Wikidata, REST Countries, Stooq, ExchangeRate-API, OWID, Natural Earth, NASA | Nothing | — |
| The Guardian Open Platform | Free developer key | Register |
| NewsData.io | Free key | Register |
| UN Comtrade | Free subscription key | Register on comtradedeveloper.un.org |
| EIA | Free key | Register |
| Ember | Free key | Register |
| ReliefWeb | `appname` | Register / request |
| UCDP | Access token | Email maintainers with project description |
| ACLED | myACLED account | Register (institutional email gives more access) |
| Google Maps Platform | API key + billing account + budget alert | Only for M3 close-up feature |

All keys go in environment variables of the ingest runner (`.env.local` locally, GitHub Actions secrets in CI). Never in client code.
