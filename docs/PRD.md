# Geo-Politics 1.0 — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Version | 3.0 (final) |
| Date | 2026-10-07 |
| Status | **Final — ready for implementation** |
| Approved design | [`all_refrence-ui/prototype-v3/`](../all_refrence-ui/prototype-v3/) and [`all_refrence-ui/mockups/`](../all_refrence-ui/mockups/) |
| Companion docs | [UI-DESIGN.md](UI-DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DATA-SOURCES.md](DATA-SOURCES.md) · [BUILD-PLAN.md](BUILD-PLAN.md) · [CONTENT-GUIDE.md](CONTENT-GUIDE.md) |

---

## 1. One-line pitch

**One living 3D globe that teaches you what is happening in the world today, why it matters, and how countries compare — in 10 seconds at a glance, and in 10 minutes if you want depth.**

## 2. What changed from the original idea

The original idea document (removed from the repo; still in git history, commit `06608ac`) described a strong *data map*. This plan turns it into a *learning product*. Main changes:

| Area | v1 plan | v2 redesign | Why |
|---|---|---|---|
| Purpose | Show data on globe | Teach geopolitics: glance → understand → go deeper | Your goal is that anyone "smjh jaaye" what is going on |
| News | Ticker at bottom, GDELT only | Every section (Home + each mode + each country) has its own verified news (Home news tab, mode card, every panel) | You asked for current news in every section |
| Learning | None | "Why it matters" cards, glossary chips, Daily Brief, cinematic Story Tours, Compare | Data alone does not teach |
| Globe symbols in modes | One icon per metric on every country (thermometer, person, chain…) | One metric colours the globe at a time (metric chips); symbols only on selected country | 6 icons × 195 countries = mess |
| Defense rating | Banned | Kept (your idea) as a **transparent Capability Index 0–10 for Air / Land / Sea**, labelled "estimate", with formula shown | You want the rating; transparency fixes the bias problem |
| Relations colours | 5 colours | Your 3 core colours (green / red / blue) + 1 amber "mixed" | India→China cannot be honestly green, red or blue |
| Missile arcs | Implied real trajectories | Symbolic arcs, triggered by verified strike reports in last 48 h, labelled "symbolic" | No free API gives real trajectories; honesty keeps trust |
| Globe look | Generic Globe.gl, dark theme | Light "paper" theme; NASA satellite globe with relief, city lights, two-layer animated clouds; Google 3D Maps–style smooth camera (inertia, zoom to cursor, tilt with zoom, parabolic fly-to); states and cities appear on zoom | Your reference image + reference site |
| UI kit | Vanilla JS + CSS | React + React Bits + 21st.dev + Motion | Your required libraries |
| Modes | Economy, Defense, Diplomacy, Energy | Same 4 (kept — they are the right 4), each limited to 5 core items | Clean and comparable |

## 3. Problem

- Geopolitics news is fragmented, text-heavy and assumes background knowledge.
- Students (school, college, UPSC / civil-services aspirants) and curious people do not have one place that shows **where** things happen, **who** is involved and **why** it matters.
- Existing world maps are either static (Wikipedia), too expert (ACLED dashboards), or opinionated (rankings sites).

## 4. Target users

| Persona | Need | What they do in the app |
|---|---|---|
| **Aarav, 21, UPSC aspirant** | Daily current affairs linked to map + background | Reads Daily Brief, opens country panels, uses Compare, saves glossary terms |
| **Meera, 16, school student** | Understand "what is NATO / why Ukraine" simply | Watches Story Tours, taps hotspots, reads "Why it matters" |
| **Rohit, 30, curious professional** | 2-minute world update | Opens Home, scans globe, reads top 5 stories |
| **Teacher** | Visual aid in class | Projects globe, runs a Story Tour full-screen |

Primary persona for MVP: **Aarav** (needs depth + daily habit). Design must still pass the **Meera test**: a 16-year-old understands every screen without a glossary.

## 5. Goals and non-goals

### Goals
1. G1 — A first-time user can say "what is happening in the world right now" after 10 seconds on Home.
2. G2 — Every visual element on the globe has a plain-language explanation one tap away.
3. G3 — Every section shows current, source-linked news (no unverified sources).
4. G4 — A user can compare two countries in Economy or Defense in under 3 taps.
5. G5 — 100 % free data stack for MVP (free tiers only; paid upgrades optional later).

### Non-goals (MVP)
- No user opinions, comments or social feed.
- No predictions or "who wins" content.
- No raw data download / research tool.
- No more than 4 Home layers and 4 modes. Ever, unless one is removed.
- No native mobile app (responsive web only).

## 6. Product principles

1. **Clean globe = effective globe.** If a symbol does not teach, remove it.
2. **One question per screen.** Home: "What is happening?" Economy: "How strong and connected is this economy?" Defense: "How secure / armed is this country?" Energy: "What powers this country and who does it depend on?" Diplomacy: "Who are its friends, rivals and blocs?"
3. **Glance → Understand → Go deeper.** Three depths, never more.
4. **Neutral and sourced.** Every number shows source + "as of" date. Every relation label shows its basis. Estimates are labelled as estimates.
5. **News is evidence, not decoration.** News items are attached to a place, a country and a section.
6. **Motion explains.** Animation shows direction (who → whom), intensity or change. No decorative loops on the globe.

## 7. Information architecture

```
GEO-POLITICS
│
├── HOME — "Global Pulse"  (default, permanent 4 layers + live news)
│     ├── ⚔️ Wars & Conflicts
│     ├── 🏛️ Alliances & Summits
│     ├── 💹 Economy Pulse
│     └── 🤝 Relations (borders by default; full map on country tap)
│
├── MODES (top switcher; selecting one clears Home layers)
│     ├── 💰 Economy
│     ├── 🛡️ Defense
│     ├── ⚡ Energy & Resources
│     └── 🌐 Diplomacy
│
└── LEARN (overlays, available everywhere)
      ├── Daily Brief (top 5 stories today)
      ├── Story Tours (cinematic guided explainers)
      ├── Glossary chips
      └── Compare (2 countries side by side, inside a mode)
```

Mode switching rules (kept from v1, they are correct):
1. Only one mode active at a time. Home layers never mix with mode layers.
2. Selecting a mode fades Home layers out and the mode layer in (400 ms).
3. Mode → mode switches directly (no stop at Home).
4. Home button, `Esc`, or tapping the active mode again returns to Home; Home data is refetched if older than its cache time.
5. Camera position is preserved across switches. Open country panel stays open and switches to the new mode's tab (change from v1: closing it lost context).
6. The left card (Global Pulse or mode card) and the news always reflect the active mode.

## 8. Learning model (how the user learns)

Every piece of content exists at three depths:

| Depth | Name | Format | Example (Russia–Ukraine war hotspot) |
|---|---|---|---|
| 1 | **Glance** | Symbol + colour on globe, 1-line label on hover/tap | Red pulse + arcs; label "Russia–Ukraine war · Day 1,687 · escalating" |
| 2 | **Understand** | Card: "What is happening", "Why it matters" (3 bullets), key numbers, latest 3 news | "Why it matters: Europe's biggest war since 1945; affects grain and gas prices; NATO–Russia tension" |
| 3 | **Go deeper** | Story Tour, timeline, full news list, Compare, sources | 90-second tour: 2014 Crimea → 2022 invasion → front line today |

Learning features:

- **Daily Brief** — top 5 stories of the day, ranked by coverage volume from trusted sources across regions. Each story is pinned to a place. Tapping it flies the camera there. Updates every hour.
- **Story Tours** — authored, 60–120 s cinematic explainers (Google 3D Maps–style fly-to + orbit). Each tour = 4–7 "stops". Each stop = camera move + 1–2 sentences + highlighted countries. Live news appears at the end ("What is happening now"). MVP ships 6 tours (list in [CONTENT-GUIDE.md](CONTENT-GUIDE.md)).
- **Glossary chips** — terms like NATO, BRICS, GDP, inflation, sanctions, NPT, chokepoint are underlined chips. Tap = 2-line definition + "see on globe" (highlights members/places).
- **"What this number means"** — every metric has one plain line: "Inflation 4.2 % → prices rise about 4 % per year. RBI target: 4 %."
- **Compare** — inside Economy or Defense, pick 2 countries; side-by-side metric bars and both highlighted on the globe.
- **Change markers** — small "▲ new" / "changed this week" badge on any hotspot, relation or metric that changed in the last 7 days. Teaches what is *moving*.

## 9. Functional requirements

Priority: **P0** = MVP must, **P1** = MVP should, **P2** = after MVP.

### 9.1 Landing / Intro (P0)

| ID | Requirement |
|---|---|
| FR-L-01 | First load plays a ≤ 4 s intro: camera flies from far out to the home view while "The world, *explained.*" fades in over the globe and blurs out. Any input skips it. |
| FR-L-02 | Intro ends on Home with all 4 layers rendered and the globe auto-rotating slowly (stops on any user input, resumes after 20 s idle). |
| FR-L-03 | A "Live" indicator shows last data update time (e.g., "Updated 12 min ago"). |
| FR-L-04 | If WebGL is not available, show a 2D fallback map (same data, flat projection). |
| FR-L-05 | **Global Pulse card** (left) lists the 4 Home layers, each with an on/off switch that shows or hides that layer on the globe. |
| FR-L-06 | **Smooth camera**: drag with inertia, zoom toward the cursor (pinch on touch), camera tilts toward the horizon when zoomed in, compass resets north and tilt. |
| FR-L-07 | **Zoom detail**: country labels → seas → state/province boundaries (from 2.0 R) → city labels → state names, as defined in UI-DESIGN §4.4. Clouds fade out when zoomed in. |

### 9.2 Home — Global Pulse (P0)

| ID | Layer | Requirement |
|---|---|---|
| FR-H-01 | Wars | Each active conflict shows a red glow with a pulse ring; size = intensity tier (low / medium / high), from curated conflict list + 7-day news volume. The top 3 conflicts also show a dark callout card (flags, name, "Active • N days"). |
| FR-H-02 | Wars | Conflicts with cross-border strikes reported by trusted sources in last 48 h show animated **symbolic** missile arcs (origin territory → target area), with trail + impact ripple. Tooltip says "Symbolic — based on reports". Max 12 arcs on screen. |
| FR-H-03 | Wars | Tap conflict → Conflict Card: name, parties, start date, status (active / ceasefire / escalating), casualty estimate with source, "Why it matters", latest 3 news, "Watch Story" if a tour exists. |
| FR-H-04 | Alliances & Summits | Round bloc badges on the globe for NATO, EU, BRICS, SCO and QUAD (G7, G20, ASEAN reachable through search, glossary and Diplomacy). Tap a badge → member countries tint in the bloc colour + bloc panel. Neutral glyphs, never official logos. |
| FR-H-05 | Summits | A summit happening now or within 7 days shows a dark callout card at the host city (emblem, name, dates) → summit panel (agenda, members, live news). |
| FR-H-06 | Economy Pulse | White market pills (↗/↘ + % + city) over 6 market cities, and a **Markets today** card (S&P 500, Nikkei 225, DAX, BSE Sensex with sparklines; "See more" opens Economy). |
| FR-H-07 | Economy Pulse | ⚠ markers on countries in active economic crisis (curated list + IMF programme status + news). Main shipping lanes shown as golden dashed flowing lines with container ships moving along them. |
| FR-H-08 | Relations (default) | Hostile borders glow red (curated list, e.g., India–Pakistan LoC, Korean DMZ); active front lines dashed red. Disputed areas use a hatched pattern with a tooltip naming the claimants. |
| FR-H-09 | Relations (tap) | Tap any country → camera flies to it, Home layers fade out, a dark quick-facts card appears beside the country, every other country colours by relation: **green** ally/partner, **red** hostile, **blue** neutral, **amber** mixed. Arcs to top 8 partners and top 3 rivals. Panel shows relation list with one-line basis each ("Russia — green: defence supplier, strategic partnership 2000"). |
| FR-H-10 | News | Bottom-right card has a **News** tab next to Markets: latest verified world headlines, each with section colour, time and source count. Tap headline → camera flies to the place and opens the related panel. |
| FR-H-11 | Learn | "Daily Brief" in the header (and the bell) opens the top 5 stories. |

### 9.3 Modes — common (P0)

| ID | Requirement |
|---|---|
| FR-M-01 | Mode dock at the bottom-left: Global Pulse · Economy · Defense · Energy · Diplomacy. Active item is a dark pill that animates between items. |
| FR-M-02 | Each mode has a **metric chip row** (max 5 chips). Exactly one chip colours the globe (choropleth) at a time. |
| FR-M-03 | Tap a country → right panel with the mode's 5 core items, each with value, "as of" date, source, "what this means" line, and a small trend sparkline when history exists. |
| FR-M-04 | Panel header (all modes): flag, name, capital, head of state/government, government type, population. |
| FR-M-05 | Each mode card ends with "Latest {mode} news" (3 items); with a country selected, the panel shows that country's news for the mode. |
| FR-M-06 | Compare button in panel (Economy, Defense P0; Energy, Diplomacy P1). |
| FR-M-07 | Country search (command palette, `/` or `Ctrl+K`) in every mode. |

### 9.4 Economy mode (P0)

Question: *"How strong is this economy and who is it connected to?"*

| # | Core item | Globe encoding | Panel content |
|---|---|---|---|
| 1 | GDP + growth | Choropleth by growth % (chip "Growth"); GDP size as country label weight | GDP (USD), growth %, IMF forecast for current year |
| 2 | Inflation | Choropleth (chip "Inflation") | Rate, central bank target if known, 5-year sparkline |
| 3 | Unemployment | Choropleth (chip "Jobs") | Rate, youth unemployment, sparkline |
| 4 | Trade partners | On country tap: export arcs (outgoing particles) and import arcs (incoming) to top 5 partners; thickness = value | Top 5 export + import partners, trade balance |
| 5 | Debt & loans | Choropleth (chip "Debt" = debt-to-GDP); on tap: creditor arcs (World Bank, IMF, China, others) | Debt-to-GDP, external debt, top creditors, active IMF programme yes/no |

Plus: currency vs USD (small line in header, P1).

### 9.5 Defense mode (P0)

Question: *"How secure and well-armed is this country?"*

| # | Core item | Globe encoding | Panel content |
|---|---|---|---|
| 1 | Military spending | Choropleth (chip "Spending") | USD, % of GDP, 10-year sparkline |
| 2 | Personnel | Choropleth (chip "Personnel") | Active armed forces total |
| 3 | Nuclear status | ☢ symbol on all 9 nuclear-armed states (uniform size) + ring on NATO nuclear-sharing hosts (chip "Nuclear") | Status, estimated warheads, delivery (land/sea/air), NPT status |
| 4 | Capability Index (Air / Land / Sea) | Choropleth by overall index (chip "Capability"); on tap: 3 bars | Air x/10, Land x/10, Sea x/10, "Estimate" badge, "How we calculate" link |
| 5 | Arms & alliances | On tap: arms import arcs from top 3 suppliers (seller → buyer); alliance members outlined | Top suppliers %, alliance memberships, major partners |

**Capability Index rule:** 0–10 per domain, computed from published inputs only (spending, personnel, inventory counts by category, power-projection assets). Formula, inputs and year are shown in a "How we calculate" modal. Label always reads "Estimate — not a ranking of who would win". See [CONTENT-GUIDE.md §4](CONTENT-GUIDE.md).

### 9.6 Energy & Resources mode (P1)

Question: *"What powers this country and who does it depend on?"*

| # | Core item | Globe encoding | Panel content |
|---|---|---|---|
| 1 | Energy mix | Choropleth by renewable share (chip "Clean %") | Stacked bar: coal, oil, gas, nuclear, hydro, solar, wind |
| 2 | Oil & gas | Choropleth by production (chip "Oil & Gas") | Production, reserves, net importer/exporter |
| 3 | Import dependence | On tap: supply arcs from top suppliers | Import share, top suppliers |
| 4 | Chokepoints | Fixed amber markers: Hormuz, Malacca, Suez, Bab-el-Mandeb, Bosporus, Panama | Card: % of world oil/LNG passing, current risk + news |
| 5 | Critical minerals | Choropleth (chip "Minerals"): share of world production of lithium, cobalt, rare earths, nickel | Top minerals, world share, top buyers |

### 9.7 Diplomacy mode (P1)

Question: *"Who are this country's friends, rivals and blocs?"*

| # | Core item | Globe encoding | Panel content |
|---|---|---|---|
| 1 | Bloc membership | Choropleth by selected bloc (chip "Blocs") | All memberships with join year |
| 2 | UN voting alignment | On tap: countries coloured by voting similarity with selected country (chip "UN votes") | Most / least aligned 5 |
| 3 | Sanctions | Directional arcs sanctioner → target (chip "Sanctions") | Sanctions imposed / received, by whom |
| 4 | Recent diplomacy | Beacons where visits, summits, agreements happened in last 30 days (chip "Activity") | Timeline of last 10 events |
| 5 | Relations summary | Same green/red/blue/amber map as Home tap | Top allies, rivals, mixed |

### 9.8 Learn features

| ID | Priority | Requirement |
|---|---|---|
| FR-E-01 | P0 | "Why it matters" block on every conflict, summit, crisis and chokepoint card. |
| FR-E-02 | P0 | "What this means" line on every metric. |
| FR-E-03 | P0 | Glossary chips (MVP 40 terms). |
| FR-E-04 | P1 | Daily Brief (top 5). |
| FR-E-05 | P1 | Story Tours (6 at launch), playable, pausable, with step dots. |
| FR-E-06 | P1 | Compare (2 countries). |
| FR-E-07 | P2 | "Changed this week" badges. |
| FR-E-08 | P2 | Quick quiz after a Story Tour (3 questions). |

### 9.9 News (P0) — required in every section

| ID | Requirement |
|---|---|
| FR-N-01 | News items come only from the trusted-source allowlist (see [DATA-SOURCES.md §3](DATA-SOURCES.md)). |
| FR-N-02 | Each item shows: headline, source name, published time (relative), country flags, section icon, link to original. No full-text copying. |
| FR-N-03 | Each item is classified into ≥ 1 section: conflict, alliances/summits, economy, defense, energy, diplomacy. |
| FR-N-04 | Each item is geolocated to a country and, when possible, a city. |
| FR-N-05 | Freshness: Home and conflict news ≤ 30 min old at fetch; other sections ≤ 3 h. |
| FR-N-06 | Duplicate stories (same event, many outlets) are clustered; show 1 headline + "12 sources". |
| FR-N-07 | If live news fails, show last cached items with "Last updated X ago" — never an empty rail. |

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | 60 fps desktop (mid-range GPU), ≥ 30 fps on mid-range Android. LCP < 2.5 s on 4G. Initial JS < 300 KB gzip before globe chunk. Globe textures progressive (2K first, 8K on desktop after idle). |
| Data freshness | See cache table in [ARCHITECTURE.md §6](ARCHITECTURE.md). Every value shows "as of". |
| Reliability | App works with all external APIs down (last-good snapshot + static seed). |
| Accessibility | WCAG 2.1 AA for all UI chrome. Colour is never the only signal (relations also use icons/patterns in the list). `prefers-reduced-motion` disables auto-rotate, arcs become static lines, fly-to becomes cut. Full keyboard path: search → country → panel → news. |
| Neutrality | No adjectives in data labels ("aggressive", "rogue"). Disputed borders shown as disputed. Relation labels always show basis. |
| Legal | Respect API terms (attribution, no full-text news). Border display: Natural Earth "de facto" view exactly as in the approved prototype, with disputed areas (Kashmir, Crimea) hatched and a tooltip naming all claimants (decision 2026-10-07). |
| Privacy | No accounts in MVP. Anonymous, cookieless analytics only. |
| Cost | ₹0 / $0 per month at MVP traffic (≤ 10k visits/month). |

## 11. Success metrics

| Metric | Target (90 days after launch) |
|---|---|
| "I understood what is happening" (1-question exit survey, yes %) | ≥ 70 % |
| Users who tap ≥ 1 hotspot / country in first session | ≥ 60 % |
| Users who open ≥ 1 mode | ≥ 40 % |
| Story Tour completion rate | ≥ 50 % |
| Day-7 return rate | ≥ 15 % |
| News rail item click-through | ≥ 8 % |
| Data freshness SLA met (news ≤ 30 min) | ≥ 95 % of hours |

## 12. Release scope

| Release | Scope |
|---|---|
| **M1 — Landing screen** | Intro, realistic globe, Home 4 layers with seed + live data, country tap relations, conflict callouts, bloc badges, markets, ships, zoom to states, Home news tab. |
| **M2 — MVP** | + Economy and Defense modes, panels, mode news, search, glossary, "Why it matters", fallbacks. |
| **M3 — Learn** | + Daily Brief, Story Tours (6), Compare, photoreal hotspot close-up (Google 3D). |
| **M4 — Full** | + Energy and Diplomacy modes, change badges, quiz. |

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No free API gives "relations" | Core Home feature | Curated baseline + alliance data + UN voting + GDELT tone, editorial review weekly. Basis shown to user. |
| No free API for missile trajectories or defense inventories | Arcs and Capability Index | Arcs are symbolic and labelled. Inventories are a curated yearly dataset with sources listed. |
| UCDP / ACLED APIs need approval tokens | Conflict data | Apply early; MVP runs on curated conflict list + GDELT. Tokens improve precision later. |
| Free news tiers have daily caps | News freshness | GDELT (no cap, no key) is primary; Guardian + NewsData.io are secondary. Server-side fetch + cache, never from the browser. |
| Google 3D close-up costs money above free cap | Budget | Feature flag; budget alert; whole app works without it. |
| Bias accusations | Trust | Neutral language rules, sources everywhere, curated data change log published. |
| Visual clutter | Core value | Hard limits: 4 Home layers, 4 modes, 5 items per mode, 12 arcs, 1 choropleth at a time. |

## 14. Decisions

| # | Question | Decision (2026-10-07) |
|---|---|---|
| 1 | Hindi language support | **No.** English only. |
| 2 | Map boundaries | **Same as the approved prototype:** de facto boundaries, disputed areas hatched with all claimants named. Note: maps shown in India that differ from India's official boundaries can draw legal complaints; revisit before a public launch in India. |
| 3 | Apply for UCDP and ACLED API tokens now | **Open.** Recommended: yes (free, but approval takes time). MVP works without them. |
