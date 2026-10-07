# Geo-Politics 1.0 — Build Plan

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-10-07 |
| Related | [PRD.md](PRD.md) · [UI-DESIGN.md](UI-DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DATA-SOURCES.md](DATA-SOURCES.md) |

Build order follows one rule: **the landing screen (Home / Global Pulse) must look and work right before any mode is built.** Weeks assume 1–2 developers part-time; adjust freely.

```
M0 Setup ─► M1 Landing screen ─► M2 MVP (Economy + Defense) ─► M3 Learn ─► M4 Energy + Diplomacy
  wk 1        wk 2–5                 wk 6–8                      wk 9–10     wk 11–12
```

---

## M0 — Setup (week 1)

### Tasks
Done in code (branch `m0-setup`):
- [x] Next.js 16 app (App Router, TypeScript, ESLint, Turbopack, React Compiler) in repo root.
- [x] Tailwind CSS v4 + design tokens from UI-DESIGN §3 in `app/globals.css` (shadcn variables mapped onto the palette; light only).
- [x] shadcn/ui (Radix) with `button`, `command`, `dialog`, `drawer`, `popover`, `tooltip`, `toggle-group`, `skeleton`, `switch`, `sheet`, `tabs`.
- [x] `motion`, `zustand`, `@tanstack/react-query`, `zod`, `three`, `@react-three/fiber`, `@react-three/drei`, `d3-geo` installed (three-globe dropped; the prototype's custom globe is ported instead).
- [x] React Bits: SplitText, BlurText, CountUp, AnimatedList, ShinyText in `components/bits/` (installed from the React Bits GitHub registry).
- [x] Fonts via `next/font/google`: Manrope (UI) and Fraunces (map labels, intro).
- [x] Supabase schema in `supabase/migrations/0001_init.sql` (ARCHITECTURE §4).
- [x] `.env.example`, `config/flags.ts`, textures in `public/textures/`.
- [x] Sphere and camera maths (`lib/geo`, `lib/camera`) with unit tests; Vitest + Playwright skeleton; CI workflow (`.github/workflows/ci.yml`).

Needs the owner's accounts (cannot be done from code):
- [ ] Create the Supabase project and apply the migration; add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Register free keys: Guardian, NewsData.io, UN Comtrade, EIA, Ember; ReliefWeb appname. Optional: UCDP token, myACLED.
- [ ] Vercel project linked to the GitHub repo (preview deploys); GitHub Actions secrets.
- [ ] 21st.dev account + API key if we want its components or the Magic MCP.

### Done when
- `npm run dev` shows the paper-theme shell with tokens and fonts; lint, typecheck, unit tests, build and the Playwright smoke test pass; preview deploy URL works (needs Vercel).

---

## M1 — Landing screen (weeks 2–5) ← current focus

Goal: rebuild the approved prototype (`all_refrence-ui/prototype-v3/`) in the real stack with real data. A first-time visitor sees the satellite globe, the short intro and the 4 Home layers, can tap a conflict, bloc or country, zoom to states and cities, and read live verified news.

Rule: match the prototype screenshots in `all_refrence-ui/mockups/` before adding anything new.

### M1.1 Globe foundation (week 2)
- [x] `scripts/build-geometry.mjs` (`npm run geo:build`): Natural Earth admin-0 1:50m → `public/geo/countries.json`; admin-1 1:10m → `public/geo/adm1/{ISO3}.json` with interior state borders only (no doubled coastlines).
- [x] Textures copied to `public/textures/`. Cloud texture licence still to verify.
- [x] `GlobeCanvas`: Earth (Phong + bump + specular + night emissive), atmosphere halo + rim, two cloud shells + shadow shell.
- [x] `CountryBorders`, `AdminBorders` (lazy below 2.05 R), `CountryOutlines` (hover white, selected gold), picking by ray → lat/lng → point-in-polygon, hover tooltip.
- [ ] `DataOverlay` canvas sphere (fills) — moved to M1.4–M1.6 where the first fills are needed.
- [x] `CameraRig`: smooth target follow, inertia, zoom to cursor, pinch, tilt with zoom, parabolic `flyTo` (intro + store requests), idle drift, reduced motion, home view fitted to screen shape. Compass button comes with the map controls in M1.2.
- [ ] Device tiering (detect-gpu) and FPS meter (dev only).
- **Check:** 60 fps on desktop, ≥ 30 fps on a mid-range Android; side-by-side screenshot with the Google 3D Maps demo at planet distance looks comparable (atmosphere rim, night lights, smooth motion).

### M1.2 Intro + chrome (week 2–3)
- [x] Intro per UI-DESIGN §5.1 (camera flies in, "The world, explained." over the globe). Any input skips it.
- [x] Header (logo, nav with "Coming soon" items, country search `/` or `Ctrl+K`, date chip, bell), Global Pulse card with 4 layer switches (closed by default on phones), map controls (compass, zoom, reset, layers), mode dock (other modes disabled until their milestone), Markets/News card with empty states. Avatar left out until accounts exist.
- [x] DOM marker registry + `MarkerProjector` (projection each frame, hidden behind the globe and under the header) and zoom-level labels: big countries, medium countries, seas, cities, state names (`data/curated/places.json`).
- [x] PanelHost (right panel desktop, bottom sheet mobile) with Motion spring; country shell with skeletons until data arrives; `Esc` closes.
- [x] Skeleton and empty states for cards and panels (stale state comes with data in M1.3).
- **Check:** Intro → Home in ≤ 4 s; skip works by click, tap, key; desktop and mobile match `v3-01-landing.png` and `v3-07-mobile.png`.

### M1.3 Data backbone (week 3)
- [x] `ingest/clients/gdelt.ts` (DOC, 6 s spacing, 429 back-off) and `rss.ts` (RSS 2.0, RDF, Atom). Guardian content comes through its free RSS for now; the key-based API is optional.
- [x] `ingest/pipeline/classify.ts` (+ sport/call-out exclusions), `geotag.ts` (names, demonyms, capitals, cities), `cluster.ts` (per-headline similarity, 24 h window) with unit tests.
- [x] `config/sources.json` allowlist with tiers and blocked state media; 2-source rule sets `verified` on clusters.
- [x] Job `news` (`npm run ingest -- news`), scheduled every 15 min in `.github/workflows/ingest-news.yml` (skips until Supabase secrets exist). Conflict strike detection runs inside `/api/pulse` from the news snapshot.
- [x] Curated data v1 (draft, flagged for editorial review): `conflicts.json`, `organizations.json`, `summits.json`, `borders.json` (hostile + disputed), `crises.json`; `data/seed/news.json` fallback. `relations_baseline.json` moves to M1.6.
- [x] Route handlers `/api/news` and `/api/pulse` with `asOf`, `stale`, `sources`; storage falls back Supabase → `data/live` → `data/seed`. News tab and header "Updated …" use them.
- **Check:** News rows appear in Supabase every 15 min; `/api/pulse` returns valid zod-parsed payload; turning off network to Supabase still serves seed with `stale: true`.

### M1.4 Home layer 1 — Wars & conflicts (week 4)
- [x] Surface glows + pulse rings, size by intensity tier and zoom; dark callout cards (flags, name, status, days) for the top 3; click targets on every hotspot.
- [x] Missile tube arcs (moving head, trail, impact ring), shown only when `/api/pulse` finds a verified strike report in the last 48 h; max 12; "symbolic" note in panel.
- [x] Conflict panel: status pill, CountUp day counter, intensity, parties with flags, Why it matters, latest news, Watch story (disabled until tours). Casualty figures wait for editor-sourced data.
- **Check:** Every arc on screen maps to a cluster with ≥ 2 trusted sources (verify in a debug overlay).

### M1.5 Home layers 2–3 — Alliances, summits, economy pulse (week 4)
- [x] Bloc badges (NATO, EU, BRICS, SCO, QUAD) → member tint on the new `DataOverlay` canvas sphere + bloc panel (purpose, members with flags, HQ, live news).
- [x] Summit callout cards for summits in the next 2 months ("dates to be confirmed" until an editor confirms); summit panel with agenda and news.
- [x] Crisis ⚠ badges; golden dashed trade routes (`data/curated/lanes.json`) with moving ships that face their direction.
- [ ] Market pills + Markets card values: blocked on a market-data provider key (Stooq added a bot check).
- **Check:** With no badge selected the globe shows no bloc tint (clean default); matches `v3-01-landing.png`.

### M1.6 Home layer 4 — Relations (week 5)
- [x] Hostile borders as red glowing tubes, front lines dashed; disputed areas hatched on the overlay (claimant tooltip still to add).
- [x] MVP relations: curated baseline `data/curated/relations.json` (draft, needs editorial review) + bloc rule (NATO/EU co-members = ally); computed in `lib/relations.ts` and served inside `/api/pulse`.
- [ ] Full relation scoring (UN votes, news tone, trade) and the review queue — needs UN voting data and GDELT events (later).
- [x] Country tap → flyTo, Home layers fade, relation fills (green / red / blue / amber), arcs to top 8 partners + 3 rivals + 3 mixed, anchored dark quick-facts card, Relations panel with filters, flags, basis lines and country news (matches `v3-02-india-relations.png`).
- **Check:** India, USA, China, Russia, Pakistan, Brazil, Nigeria relation maps reviewed manually against baseline; no unexplained status.

### M1.7 Landing polish + release (week 5)
- [ ] News tab in the Markets/News card: section colour, time, source count; tap → flyTo + open panel.
- [x] Search (command palette) for countries, conflicts and blocs.
- [x] Accessibility pass: axe WCAG 2.1 AA check in `e2e/a11y.spec.ts` (no serious issues), darker caption token, labelled globe, keyboard search and `Esc`; reduced motion handled in camera, clouds and arcs.
- [x] 2D fallback map for no-WebGL (d3-geo, same panels; e2e test with WebGL disabled).
- [x] E2E: smoke, APIs, conflict panel, bloc panel, relations, zoom, 2D fallback, accessibility.
- [ ] Lighthouse CI budgets (deferred until the Vercel preview exists).
- [x] `/sources` page (datasets, licences, trusted outlets by tier, blocked outlets).
- **M1 release criteria:**
  - 5 test users (2 students, 1 UPSC aspirant, 2 non-experts) each explain "what is happening in the world" after 10 s on Home — ≥ 4 of 5 succeed.
  - No layer exceeds its visual budget (UI-DESIGN §4.3).
  - All data shows "as of" and source.

---

## M2 — MVP: Economy + Defense modes (weeks 6–8)

### Tasks
- [x] Mode machine in Zustand per PRD §7 (switch clears Home layers and makes them inert; Home restores them).
- [x] Layer fade; Earth texture and clouds dim in modes so the choropleth reads clearly.
- [x] Choropleth system: per-mode scale (5th–95th percentile, log for totals), legend bar, metric chips (single select).
- [x] Country panel template: core items, "what this means", sparklines (forecast years dashed), source + as-of, 3 news.
- [x] Leader / government line from Wikidata in the panel header (`npm run ingest -- profiles`).
- [ ] **Economy**: [x] IMF job (growth, inflation, unemployment, debt, GDP size; `npm run ingest -- indicators`); [x] Comtrade top-5 export/import partners for 63 large economies, arcs on tap (`npm run ingest -- trade`); [ ] IDS creditors and creditor arcs; [ ] "Trade" choropleth chip.
- [x] **Defense** (draft data, needs editorial review): World Bank SIPRI indicators + SIPRI latest year + arms transfers import; `nuclear.json`; `capability.json` + index calc + "How we calculate" dialog. Chips: Spending, Personnel, Nuclear, Capability, Arms.
- [x] Mode news in the mode card and country panel (section filter, + country filter on selection).
- [x] Compare for Economy + Defense: "Compare with…" then tap a second country; camera frames both; paired bars in neutral colours, no winner.
- [x] Glossary: 40 terms (`data/curated/glossary.json`, draft for review), `/glossary` page, underlined chips in mode card, country panel and bloc chips, related terms, "See on globe" (bloc tint, member highlight or fly-to); deep link `/?term=<id>`.
- [ ] E2E: Home → Economy (Home layers gone) → Defense → Home (Home layers back, news refreshed).

### Done when
- PRD FR-M-01…07, §9.4, §9.5 pass.
- Mode switch never shows Home and mode layers together (Playwright screenshot assertion).

---

## M3 — Learn (weeks 9–10)

- [ ] Daily Brief: hourly job ranks clusters (source count × tier × region diversity), editor can pin/unpin; AnimatedList panel; tap → flyTo.
- [ ] Story Player: script loader, step dots, play/pause, caption BlurText, orbit, final live-news stop.
- [ ] Write and review 6 tours (CONTENT-GUIDE §5.2).
- [ ] Google photoreal close-up (`closeUp` flag): lazy `gmp-map-3d`, crossfade handoff from R3F, `flyCameraTo` + `flyCameraAround`, budget alert in Google Cloud, attribution.
- [ ] Tour completion + brief click analytics events.

### Done when
- Tour completion ≥ 50 % in a 10-person test; close-up cost tracked and inside free cap.

---

## M4 — Energy + Diplomacy (weeks 11–12)

- [ ] **Energy**: OWID + Ember + EIA + Comtrade HS 2709/2711 + USGS jobs; chokepoints markers + cards; chips: Clean %, Oil & Gas, Imports, Chokepoints, Minerals.
- [ ] **Diplomacy**: UN voting alignment computation; GDELT Events diplomacy beacons (30 days); sanctions arcs from `sanctions.json`; chips: Blocs, UN votes, Sanctions, Activity, Relations.
- [ ] Enable modes (flags), Compare for both.
- [ ] "Changed this week" badges from `change_log`.
- [ ] Post-tour 3-question quiz (P2, optional).

---

## Cross-cutting checklist (every milestone)

- [ ] No new layer, mode or panel item beyond PRD limits.
- [ ] Every new data value: source, as-of, "what this means".
- [ ] Every new animation: answers "what does this motion tell the user?"
- [ ] Reduced-motion and mobile checked.
- [ ] Neutral wording check against CONTENT-GUIDE §1.
- [ ] API limits still inside free tiers (DATA-SOURCES §5).

## Immediate next steps (this week)

1. Decide PRD §14 item 3 (apply for UCDP/ACLED tokens). Items 1–2 are decided.
2. Do M0 setup.
3. Start M1.1 globe foundation and compare it visually against the Google 3D Maps reference at planet distance before building any layer.
