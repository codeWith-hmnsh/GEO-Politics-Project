# Geo-Politics 1.0 — Technical Architecture

| Field | Value |
|---|---|
| Version | 2.0 |
| Date | 2026-10-07 |
| Related | [PRD.md](PRD.md) · [UI-DESIGN.md](UI-DESIGN.md) · [DATA-SOURCES.md](DATA-SOURCES.md) · [BUILD-PLAN.md](BUILD-PLAN.md) |

---

## 1. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | React is required by React Bits, 21st.dev and Motion; route handlers give us a free API layer; easy Vercel deploy |
| Styling | **Tailwind CSS v4** + CSS variables (tokens from UI-DESIGN §3) | 21st.dev and shadcn components are Tailwind-based |
| UI primitives | **shadcn/ui** (Radix) | Required base for 21st.dev components; accessible |
| Effects | **React Bits** (copied into `components/bits/` via `npx shadcn add @react-bits/...` or jsrepo) | Text and background effects |
| Community components | **21st.dev** (`npx shadcn@latest add "https://21st.dev/r/<author>/<component>"`) | Tabs, cards, drawers |
| Animation | **Motion** (`motion/react`) | Layout animations, AnimatePresence, springs |
| Globe | **React Three Fiber + three.js + drei** with custom shaders, ported from the approved prototype (`all_refrence-ui/prototype-v3/`) | Full control of missile arcs, pulses, choropleth, camera; free; no tile costs |
| Photoreal close-up | **Google Maps JS `gmp-map-3d`** (Map3DElement), lazy-loaded behind flag | Exact reference look for close-ups only |
| 2D fallback | **d3-geo** SVG map | No-WebGL devices |
| Client state | **Zustand** | Mode machine, selection, camera targets |
| Server data on client | **TanStack Query** | Caching, refetch on mode return |
| Database | **Supabase Postgres** (free tier) | News, events, indicators, history for "changed this week" |
| Ingest jobs | **TypeScript scripts** run by **GitHub Actions** scheduled workflows | Free (public repo), 15-min cadence matches GDELT |
| Hosting | **Vercel** (Hobby) | Free, edge cache, ISR |
| Analytics | Vercel Web Analytics or Plausible-compatible cookieless | Privacy |

### Why not render the whole globe with Google 3D Maps?

The reference look comes from Google's Photorealistic 3D Maps. We use it only for close-ups because:
1. `gmp-map-3d` does not let us run custom shaders (missile trails, choropleth blending, particle flows) — our core visuals.
2. It needs a billing account; above the free monthly cap every load costs money.
3. At planet distance a three.js Earth with NASA textures + atmosphere shader looks equivalent, and we control it fully.

So: **three.js for the planet (always), Google 3D for "See the place" (optional).** The handoff is a crossfade at the end of a fly-to: R3F camera reaches 1.25 R over the target → Map3DElement mounts at same lat/lng with `range` ≈ 800 km → `flyCameraTo` down to 2–5 km → `flyCameraAround`.

Alternative considered: **CesiumJS + Google Photorealistic 3D Tiles** for one seamless engine. Rejected for MVP (heavier bundle, harder integration with React Bits/Motion styling, tile costs from first load). Revisit if seamless zoom becomes a priority.

## 2. System overview

```
                ┌──────────────────────── INGEST (GitHub Actions cron) ─────────────────────────┐
                │                                                                                │
  GDELT DOC/GEO ┤  news-global (15m)  news-country (60m)  conflicts (30m)  events (15m)          │
  RSS / Guardian┤  economy (daily)  markets (daily)  trade (weekly)  defense/energy/diplo (wkly) │
  IMF / WB / ...┤                                                                                │
                │   fetch → validate (zod) → normalise → classify → geotag → dedupe/cluster      │
                │        → score (relations, intensity) → write                                  │
                └───────────────────────────────┬────────────────────────────────────────────────┘
                                                │
                                   ┌────────────▼────────────┐
                                   │  Supabase Postgres      │  + curated JSON (repo /data/curated)
                                   │  tables + snapshot rows │
                                   └────────────┬────────────┘
                                                │ (server-only key)
                                   ┌────────────▼────────────┐
                                   │ Next.js route handlers  │  /api/pulse  /api/mode/[mode]
                                   │ revalidate per cache    │  /api/country/[iso3]  /api/news
                                   │ table (§6)              │  /api/brief  /api/relations/[iso3]
                                   └────────────┬────────────┘
                                                │ JSON (CDN cached)
                                   ┌────────────▼────────────┐
                                   │ Browser                 │
                                   │ TanStack Query → Zustand│
                                   │ → R3F globe + DOM UI    │
                                   └─────────────────────────┘
```

Rules:
- Browser never calls third-party data APIs (except Google Maps JS for close-up).
- Every endpoint returns `{ data, asOf, stale: boolean, sources: [...] }`.
- If DB read fails, route handler serves the newest file from `data/seed/` (committed fallback snapshot) with `stale: true`.

## 3. Frontend architecture

### 3.1 Component tree

```
app/layout.tsx                 fonts, tokens, providers (QueryClient, Theme)
app/page.tsx                   <Experience/>
└─ Experience
   ├─ GlobeCanvas (R3F, mounted once, dynamic import, ssr:false)
   │  ├─ Earth (Phong: Blue Marble map, topology bump, water specular, night-lights emissive)
   │  ├─ DataOverlay (transparent sphere; canvas fills: relations, bloc tint, choropleth, disputed hatch)
   │  ├─ Borders (country line segments) + AdminBorders (states, lazy below 2.0 R) + HoverOutline
   │  ├─ Clouds (2 shader shells with drift + wobble, cloud-shadow shell)
   │  ├─ Atmosphere (back-side halo + front rim)
   │  ├─ LayerRegistry  → renders active layer set for current mode
   │  │   ├─ home/WarsLayer        (surface glows, pulse rings, missile tube arcs, impact rings)
   │  │   ├─ home/EconomyLayer     (golden dashed trade-route tubes)
   │  │   ├─ home/RelationsLayer   (hostile border tubes, front lines; relation arcs on selection)
   │  │   ├─ economy/*  defense/*  energy/*  diplomacy/*
   │  └─ CameraRig (smooth target follow, inertia, zoom-to-cursor, tilt, flyTo, idle drift, reduced motion)
   ├─ MarkerOverlay (DOM, projected each frame: conflict callouts, bloc badges, market pills,
   │                 ships, crisis/nuclear/chokepoint badges, labels by zoom level, anchored card)
   ├─ Header (Logo, Nav, Search, DateChip, Bell, Avatar)
   ├─ PulseCard (layer switches) | ModeCard (metric chips, scale, mode news)
   ├─ MapControls (compass, zoom, locate, layers)
   ├─ ModeDock
   ├─ MarketsNewsCard (Markets | News tabs)
   ├─ PanelHost (ConflictPanel | CountryPanel | BlocPanel | SummitPanel | ChokepointPanel | BriefPanel | ComparePanel)
   ├─ StoryPlayer (overlay, P1)
   ├─ CloseUpView (gmp-map-3d, lazy, P1)
   └─ Intro (first visit only)
```

### 3.2 State (Zustand)

```ts
type Mode = 'home' | 'economy' | 'defense' | 'energy' | 'diplomacy';

interface AppState {
  mode: Mode;
  metric: Record<Exclude<Mode, 'home'>, string>; // active chip per mode
  selection:
    | { kind: 'none' }
    | { kind: 'country'; iso3: string }
    | { kind: 'conflict'; id: string }
    | { kind: 'summit'; id: string }
    | { kind: 'org'; id: string };
  compareWith?: string;           // iso3
  camera: { target?: CameraTarget; autoRotate: boolean };
  tour?: { id: string; step: number; playing: boolean };
  introDone: boolean;
  setMode(m: Mode): void;         // implements transition rules (PRD §7)
  select(s: AppState['selection']): void;
}
```

Mode transition rules live in `setMode` only:
- `setMode(same mode)` when not home → `home`.
- Selection of kind `conflict | summit | org` is cleared when leaving home; `country` selection is kept.
- `compareWith` cleared when entering home.

### 3.3 Layer contract

Every globe layer implements one interface, so modes stay isolated and the "clear everything" rule is automatic:

```ts
interface GlobeLayer<T> {
  id: string;                          // 'home.conflicts'
  modes: Mode[];                       // where it is visible
  useData(): { data?: T; isLoading: boolean };
  render(props: { data: T; opacity: MotionValue<number> }): JSX.Element;
  budget: { arcs?: number; markers?: number };
}
```

`LayerRegistry` fades layers in/out with a shared `opacity` motion value (400 ms) and unmounts them after fade-out.

### 3.4 Camera rig

Ported from the prototype (`applyCam`, `flyTo`, `stepFly`, wheel and pointer handlers):

- State: `{lat, lng, dist}` for the camera and a target `T`. Each frame the camera eases to `T` with factor `1 − e^(−9·dt)`.
- Position: point `P` on the sphere under the camera; camera = `P + h·(cosθ·N − sinθ·north)` where `h = dist − 1`, `N` = surface normal, `θ = tilt(dist)` (0 above 1.85 R, up to 52° near the surface). `camera.up = north`, `lookAt(P)`. Near plane scales with altitude.
- Drag: degrees per pixel ∝ `(dist − 1)`, longitude divided by `cos(lat)`; release velocity decays 0.9 per frame.
- Wheel: `dist *= e^(deltaY·0.0013)`, and the target moves toward the lat/lng under the cursor by the zoom fraction (zoom to cursor).
- `flyTo(lat, lng, dist, ms)`: great-circle interpolation + altitude bump `h·sin(πt)`, cubic in-out; cancelled by any input.
- `orbit(center, degrees, seconds)` for tours; `fitBounds([iso3a, iso3b])` for Compare.
- Limits: 1.11 R – 5.5 R; latitude ±80°.

### 3.5 Performance

- Globe chunk loaded with `next/dynamic` after first paint; intro text renders in DOM immediately.
- Textures: start with the prototype JPEGs (Blue Marble 4K, topology, water mask, night lights 2K, clouds 4K); convert to KTX2/Basis in M1.7; 8K Blue Marble on desktop after idle.
- Country geometry: Natural Earth admin-0 pre-built at build time (borders as line segments, polygons for picking and canvas fills), not runtime GeoJSON parsing. Admin-1 (states) per country in separate files, lazy-loaded below 2.0 R.
- DOM markers: one overlay, positions written with `transform` each frame; markers behind the globe or under the header are hidden.
- Arcs, pulses, markers use instancing; one draw call per layer type.
- `frameloop="demand"` when nothing animates (no auto-rotate, no arcs) — saves battery.
- Device tiering (`detect-gpu`): tier 1 disables clouds, night lights blend, uses 1:110m borders, halves arc counts.

## 4. Backend data model (Postgres)

```
countries        iso3 PK, iso2, name, capital, lat, lng, region, population,
                 head_of_state, head_of_gov, gov_type, updated_at

news_items       id PK, cluster_id FK, url UNIQUE, title, source_domain, source_tier,
                 published_at, sections text[], countries text[], lat, lng,
                 tone numeric, lang, fetched_at

news_clusters    id PK, title, sections text[], countries text[], lat, lng,
                 first_seen, last_seen, source_count, top_item_id, score

conflicts        id PK, name, parties text[], start_date, type, status, intensity_tier,
                 centroid_lat, centroid_lng, why_it_matters text[], tour_id,
                 casualty_estimate, casualty_source, reviewed_at        -- seeded from curated JSON

strike_reports   id PK, conflict_id FK, origin_iso3, target_lat, target_lng,
                 reported_at, cluster_id FK, expires_at                  -- drives missile arcs (48 h)

organizations    id PK, name, glyph, colour, hq_lat, hq_lng, purpose, members text[]
summits          id PK, org_id, name, city, lat, lng, starts_on, ends_on, agenda text[]

indicators       iso3, code, year, value, source, as_of            PK(iso3, code, year)
trade_partners   reporter, partner, flow ('X'|'M'), year, value_usd, hs_code
arms_transfers   supplier, recipient, year, tiv
creditors        debtor, creditor, year, value_usd

relations        a_iso3, b_iso3, status ('ally'|'hostile'|'neutral'|'mixed'),
                 score, components jsonb, basis text, source ('computed'|'curated'),
                 reviewed_at                                            PK(a_iso3, b_iso3)

snapshots        key PK ('pulse', 'mode:economy:growth', ...), payload jsonb, as_of
change_log       id, entity, entity_id, field, old, new, changed_at     -- "changed this week"
```

`snapshots` hold pre-computed API payloads so route handlers do one indexed read.

## 5. Relation scoring

For each country pair (A, B), computed weekly; curated overrides win.

```
components (each in [-1, 1]):
  alliance   = +1 shared military alliance or formal strategic partnership
               +0.5 shared major bloc (BRICS, EU, ASEAN, SCO, QUAD)
               -1 active armed conflict between them, or no diplomatic relations
  un_votes   = normalised UNGA agreement vs world mean (z-score clipped to ±1)
  news_tone  = mean GDELT Goldstein score of A↔B events, last 90 days, / 10
  ties       = log-scaled bilateral trade + arms transfers, normalised to [0, 1]

score = 0.35·alliance + 0.25·un_votes + 0.25·news_tone + 0.15·ties

status:
  hostile  if active conflict OR curated hostile OR score ≤ -0.35
  mixed    if max(component) ≥ 0.4 AND min(component) ≤ -0.4   (e.g. big trade + border clashes)
  ally     if score ≥ 0.35
  neutral  otherwise
basis      = top 2 contributing components as text
             ("defence supplier; strategic partnership since 2000")
```

Editorial: `data/curated/relations_baseline.json` holds reviewed pairs for the top 40 countries. Any computed status that disagrees with the baseline goes into a weekly review queue (`npm run review:relations`) instead of changing silently.

## 6. Cache and freshness

| Endpoint / data | Ingest interval | Route `revalidate` | Client `staleTime` |
|---|---|---|---|
| `/api/news?section=…` | 15 min | 300 s | 5 min |
| `/api/pulse` (Home layers) | 15–30 min | 300 s | 5 min |
| Strike arcs | 30 min | 300 s | 5 min |
| `/api/brief` | 60 min | 900 s | 15 min |
| `/api/relations/[iso3]` | weekly + daily tone | 6 h | 1 h |
| `/api/mode/economy` | daily | 24 h | 1 h |
| `/api/mode/defense`, `/energy`, `/diplomacy` | weekly | 24 h | 6 h |
| `/api/country/[iso3]` | per source | 6 h | 1 h |
| Country metadata | weekly | 7 d | 24 h |

Returning to Home refetches `/api/pulse` and Home news if older than `staleTime` (PRD: "back on Home, fetch fresh news").

## 7. API endpoints

| Method + path | Returns |
|---|---|
| `GET /api/pulse` | Conflicts (with intensity), active strike arcs, org list, summits (now/soon), market arrows, crises, hostile borders, disputed areas |
| `GET /api/news?section=&country=&limit=` | Clustered verified news |
| `GET /api/brief` | Top 5 clusters with place + why-it-matters |
| `GET /api/relations/[iso3]` | All pairs for that country with status, score, basis |
| `GET /api/mode/[mode]?metric=` | Choropleth values per country + scale + asOf |
| `GET /api/country/[iso3]?mode=` | Panel payload for that mode (5 core items + header + 3 news) |
| `GET /api/compare?a=&b=&mode=` | Paired values |
| `GET /api/tours`, `GET /api/tours/[id]` | Story tour scripts (static MDX/JSON) |

Validation: all payloads typed with **zod** schemas shared between ingest and frontend (`lib/schemas`).

## 8. Repository structure

```
Geo-Politics-1.0/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── sources/page.tsx              # dataset + licence list
│   └── api/ (pulse, news, brief, relations, mode, country, compare, tours)
├── components/
│   ├── globe/                        # R3F scene, CameraRig, CountryLayer, shaders/
│   ├── layers/{home,economy,defense,energy,diplomacy}/
│   ├── panels/                       # ConflictCard, CountryPanel, SummitCard, BriefPanel, ComparePanel
│   ├── chrome/                       # Header, PulseCard, ModeCard, ModeDock, MapControls, MarketsNewsCard
│   ├── learn/                        # StoryPlayer, GlossaryChip, WhyItMatters
│   ├── bits/                         # React Bits components (copied, restyled)
│   └── ui/                           # shadcn + 21st.dev components (restyled)
├── lib/
│   ├── store.ts                      # Zustand
│   ├── schemas/                      # zod
│   ├── camera/                       # flyTo math
│   ├── geo/                          # projections, great-circle, bounds
│   └── format.ts                     # numbers, dates, "as of"
├── ingest/
│   ├── jobs/                         # news-global.ts, conflicts.ts, economy.ts ...
│   ├── clients/                      # gdelt.ts, guardian.ts, rss.ts, imf.ts, worldbank.ts, comtrade.ts ...
│   ├── pipeline/                     # classify.ts, geotag.ts, cluster.ts, score-relations.ts
│   └── run.ts                        # CLI: tsx ingest/run.ts news-global
├── data/
│   ├── curated/                      # conflicts, organizations, summits, nuclear, capability,
│   │                                 # relations_baseline, hostile_borders, chokepoints, sanctions, crises
│   ├── seed/                         # last-good snapshots (fallback)
│   ├── glossary.json
│   └── tours/                        # story tour scripts
├── config/
│   ├── sources.json                  # trusted news allowlist + tiers
│   ├── classifier.json
│   └── flags.ts                      # feature flags (closeUp, energy, diplomacy, tours)
├── public/
│   ├── textures/                     # blue-marble, topology, water, night, clouds (JPEG → KTX2)
│   └── geo/                          # prebuilt admin-0 geometry + admin-1 per country
├── scripts/                          # build-geometry.ts, compress-textures.ts
├── .github/workflows/                # ingest-15m.yml, ingest-hourly.yml, ingest-daily.yml, ingest-weekly.yml
├── docs/                             # this documentation
└── all_refrence-ui/
```

## 9. Ingest runner details

- GitHub Actions schedules: `*/15 * * * *`, `0 * * * *`, `30 2 * * *`, `0 3 * * 1`.
- Scheduled workflows can start several minutes late under load; freshness SLA (PRD §11) allows for this.
- Free minutes: unlimited for public repositories. For a private repo, the 15-min job must stay under ~40 s per run to fit 2,000 min/month — or move the 15-min job to a Supabase Edge Function on `pg_cron`.
- Every job is idempotent (upsert on natural keys), logs counts, and fails loudly (workflow failure → GitHub notification).
- GDELT client enforces ≥ 5 s spacing and retries with backoff.

## 10. Feature flags

| Flag | Default | Turns on |
|---|---|---|
| `closeUp` | off | Google photoreal "See the place" |
| `tours` | off until M3 | Story Tours |
| `energyMode`, `diplomacyMode` | off until M4 | Modes 3 and 4 (shown greyed with "Coming soon") |
| `ucdp`, `acled` | off | Use these sources once tokens are granted |

## 11. Environment variables

```
# server / ingest only
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GUARDIAN_API_KEY=
NEWSDATA_API_KEY=
COMTRADE_API_KEY=
EIA_API_KEY=
EMBER_API_KEY=
RELIEFWEB_APPNAME=
UCDP_TOKEN=
ACLED_EMAIL=
ACLED_KEY=

# client (restricted by HTTP referrer in Google Cloud console)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
```

## 12. Testing

| Level | What |
|---|---|
| Unit (Vitest) | flyTo math, relation scoring, classifier, cluster, formatters |
| Contract | zod parse of recorded fixtures from every external API (catches API changes) |
| Component (Testing Library) | ModeDock rules, layer switches, panels, Markets/News card empty/stale states |
| E2E (Playwright) | Intro skip → Home → tap conflict → mode switch clears Home layers → back to Home restores them |
| Visual | Playwright screenshots of Home, each mode, panel, mobile sheet |
| Performance | Lighthouse CI (LCP, JS size), in-app FPS meter in dev |
