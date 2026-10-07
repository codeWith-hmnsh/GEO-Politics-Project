# Geo-Politics 1.0 — UI & Interaction Design (final)

| Field | Value |
|---|---|
| Version | 3.0 (final, approved prototype) |
| Date | 2026-10-07 |
| Related | [PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [BUILD-PLAN.md](BUILD-PLAN.md) |
| Approved prototype | [`all_refrence-ui/prototype-v3/index.html`](../all_refrence-ui/prototype-v3/index.html) (run with a local server, see below) |
| Screenshots | [`all_refrence-ui/mockups/`](../all_refrence-ui/mockups/) |
| User reference images | [`user-reference-globe-ui.png`](../all_refrence-ui/user-reference-globe-ui.png) (main target), [`user-reference-landing-theme.png`](../all_refrence-ui/user-reference-landing-theme.png) |
| Motion reference | Google Maps Platform 3D Maps demo — https://mapsplatform.google.com/demos/3d-maps/ |
| Libraries | **React Bits** · **21st.dev** (shadcn registry) · **Motion** (motion.dev, `motion/react`) |

> **The prototype is the source of truth for look and feel.** When this document and the prototype disagree on a visual detail, the prototype wins; update this document.
>
> Run the prototype: `npx serve all_refrence-ui/prototype-v3` then open the printed URL. Opening the file directly (`file://`) blocks the textures. Deep links for each state: `#india`, `#states`, `#conflict`, `#economy`, `#defense`, `#tour`, `#nato`.
>
> "motion.ai" in the brief is read as **Motion** (motion.dev).

---

## 1. Design north star

**"A calm, real planet with a few loud truths."**

A photoreal Earth floats in a soft, misty sky. The page is light and quiet. Only today's important things are loud: a red glow where war is, a moving missile arc, a red border line, a ship on a golden route. Everything else lives in white glass cards around the globe.

Feelings, in order: **wonder** (first 4 s) → **clarity** (first 10 s) → **curiosity** (tap → learn).

## 2. Screen anatomy (desktop ≥ 1280 px)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ (●●) GeoPolitics   Home  Daily Brief  Stories  Glossary  Sources   [🔍 Search…] [📅 date · updated] [🔔] (M) │  header, transparent
├──────────────┐                                                       ┌──────────┐    │
│ GLOBAL PULSE │                    🌍  SATELLITE GLOBE                  │ sample   │    │
│ ● Live       │              (fills height, centred, clouds,           └──────────┘    │
│ ⚔ Wars    ◉ │               callout cards, badges, ships)                   (N)       │
│ 🏛 Summits ◉ │                                                               [+][−]    │  map controls,
│ 📊 Economy ◉ │                                                               (◎)       │  right middle
│ 👥 Relations◉│                                                               [≡]       │
│ hint text    │                                                                         │
└──────────────┘                                                    ┌──────────────────┐ │
┌─────────────────────────────────────────────┐                     │ Markets today    │ │
│ [● Global Pulse] Economy Defense Energy Diplomacy │                │ S&P Nikkei DAX BSE│ │
└─────────────────────────────────────────────┘                     └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

When a country, conflict, bloc or story is opened, a **detail panel** (400 px) slides in on the right; the Markets card and the sample pill fade out and the map controls shift left.

### Mobile (< 760 px)
- Header: logo + bell only. Search moves into a full-screen sheet (later).
- Global Pulse card is hidden behind a **Layers** button (top-left).
- Mode dock spans the bottom, horizontally scrollable.
- Detail panel becomes a bottom sheet (max 62 % height).
- Map controls hidden (pinch, drag, tap).
- Anchored dark card and zoom hint hidden.
- Tap targets ≥ 44 px.

## 3. Visual language

### 3.1 Colour tokens (light theme only)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F3F1EC` | Page background |
| `--paper-2` | `#EAE7DF` | Tracks, subtle fills |
| sky gradient | radial `#D7E3EA` behind globe → paper | Misty sky around the globe |
| `--ink` | `#11232B` | Primary text, active dock item (`#0F1D24`) |
| `--ink-2` | `#4A5A61` | Secondary text |
| `--ink-3` | `#7D8A8F` | Captions, sources |
| `--line` | `rgba(17,35,43,.10)` | Borders |
| `--card` | `rgba(255,255,255,.86)` + `blur(18px)` | Glass cards |
| `--night` | `rgba(16,24,30,.88)` | Dark callouts, anchored card, tooltips |
| `--shadow` | `0 16px 44px rgba(17,35,43,.13), 0 2px 6px rgba(17,35,43,.06)` | Cards |

Semantic (globe + UI). Colour is never the only signal — each has a shape or icon too.

| Token | Value | Meaning | Paired cue |
|---|---|---|---|
| `--conflict` | `#E5484D` | War, hostile, market down | Glow + pulse ring, ✕ dot |
| `--ally` | `#2FA36B` | Ally / partner, market up | Solid dot |
| `--neutral` | `#4C74D9` | Neutral relation | Hollow dot |
| `--mixed` | `#E8A21C` | Mixed relation, crisis, chokepoint | Half dot, ⚠ |
| `--summit` | `#3F63D8` | Organisations layer | Badge |
| `--nuclear` | `#E8C21C` | Nuclear-armed | ☢ badge |
| `--gold` | `#F2B33D` | Trade routes, stories, selected country | Dashed line |

Layer toggle colours: Wars `#E5484D`, Summits `#3F63D8`, Economy `#E9A21C`, Relations `#2FA36B`.

Mode choropleth scales (low → high, painted at 80 % opacity over the satellite image, earth dimmed to 78 %):

| Mode | Scale |
|---|---|
| Economy | `#FFF1C7` → `#F6C25B` → `#E57A3A` → `#B3352C` |
| Defense | `#E8ECFA` → `#9DB4F0` → `#3F63D8` → `#1B2F7A` |
| Energy | `#E5F4D8` → `#A6D88C` → `#3FA765` → `#16613D` |
| Diplomacy | `#F6E2EC` → `#E2A1BA` → `#C25A84` → `#7A2450` |

### 3.2 Typography

| Role | Font | Spec |
|---|---|---|
| UI, headings, numbers | **Manrope** | 400–700; card titles 22 px/700; panel title 26 px/700; numbers tabular |
| Map labels, intro, brief numbers | **Fraunces** | Country labels 13 px, letter-spacing .3em, uppercase; ocean labels italic; intro headline 40–84 px |

Both from Google Fonts (`next/font/google` in the build).

### 3.3 Shape and spacing
- Radius: chips 999 px, buttons 11–12 px, cards 16–18 px, panel 20 px, map controls round.
- Spacing scale: 4, 8, 12, 16, 22, 32.
- Max 3 floating cards visible at once (Pulse, Markets, Panel) + dock.

### 3.4 Icons
- UI icons: **Lucide** (ships with shadcn/ui).
- Bloc emblems: simplified neutral glyphs (NATO star, EU star ring, BRICS five dots, QUAD diamonds, ASEAN sheaf, text for SCO/G7/G20). **Never official logos.**
- Flags: simplified SVG flags for the countries shown in callouts. In the build use a full flag set (e.g. `flag-icons`), not emoji (Windows does not render flag emoji).

## 4. Globe

### 4.1 Look

| Element | Spec |
|---|---|
| Surface | NASA Blue Marble 4K (8K on desktop later), Phong material |
| Relief | Topography bump map, `bumpScale .012` |
| Water | Specular map, soft sun glint on oceans |
| City lights | Night-lights texture as warm emissive (`#FFC87A`, .55) — gives the golden city glow seen in the reference |
| Light | Directional "sun" fixed to the camera (upper-left) + ambient .34 → right limb slightly darker |
| Atmosphere | Back-side Fresnel halo (`#B8DBFF`) + front rim haze |
| Borders | Country lines as 3D line segments, white 42 % → 80 % as you zoom in |
| Hover | Hovered country outline turns solid white + dark tooltip with name (and relation when a country is selected) |
| Data fills | Transparent overlay sphere painted from a canvas (relations, bloc members, choropleth, disputed hatch) |

### 4.2 Clouds ("stratosphere")
- **Layer A** at 1.011 R: cloud texture, drifts east slowly, wobble distortion in the shader, lit by the sun direction.
- **Layer B** at 1.026 R: same texture offset, faster, 32 % opacity → parallax depth.
- **Cloud shadow** at 1.0028 R: dark copy, slightly offset.
- Clouds fade as you zoom in (gone below ~1.2 R) and drop to 35 % in modes / when a country is selected so data reads clearly.
- CSS cloud puffs behind and in front of the canvas blend the globe into the misty sky.

### 4.3 Layers and symbols (Home)

| Layer | Symbols |
|---|---|
| Wars & conflicts | Red additive glow on the surface (size = intensity), white-hot core, expanding pulse ring. **Dark callout cards** (flags + name + "Active • N days") for the top 3 conflicts. **Missile arcs**: tube with moving bright head, fading trail, base line 14 %, impact ring at the target. Labelled "symbolic" in panels. |
| Summits & organizations | Round navy **bloc badges** with emblem and label (NATO, EU, BRICS, SCO, QUAD by default; others appear when selected). Tap badge → members tint in bloc colour + panel. Summit = dark callout card with emblem and dates. |
| Global economy | White **market pills** (↗ +0.7 % Mumbai) over 6 market cities. **Golden dashed trade routes** that flow, with **container ships** (side-view SVG) sailing along them and flipping with direction. Amber ⚠ badges on crisis countries. |
| Relations | Hostile borders (LoC, Korean DMZ) as red glowing tubes; Ukraine front line dashed. Disputed areas (Kashmir, Crimea) hatched with a dashed edge. On country tap: green / red / amber / blue fills + coloured arcs to top partners and rivals. |

Budgets: ≤ 12 missile arcs, ≤ 14 relation arcs, ≤ 20 ships, ≤ 3 conflict callouts, ≤ 6 bloc badges visible.

Markers closer than 78 px to the top edge are hidden so they never sit under the header. Markers on the far side of the globe fade out.

### 4.4 Zoom levels (level of detail)

| Camera distance (Earth radii) | What appears |
|---|---|
| > 3.6 | Continental labels only |
| ≤ 3.6 | Big country labels (RUSSIA, CHINA, INDIA …), oceans |
| ≤ 2.3 | Seas and bays; "Zoom in to see states and cities" hint |
| ≤ 2.15 | Medium country labels |
| ≤ 2.0 | **State / province boundaries** load and fade in |
| ≤ 1.75 | **City labels** with glowing dots |
| ≤ 1.62 | **State names** |
| ≤ 1.85 | Camera **tilts** toward the horizon (up to 52° at 1.2 R) |
| 1.11 | Closest zoom |

## 5. Camera and motion

### 5.1 Camera behaviour (Google 3D Maps feel)
- **Smooth follow:** input changes a target; the camera eases to it every frame (`1 − e^(−9·dt)`).
- **Drag:** rotates; speed scales with altitude and latitude. Releasing with speed keeps the globe gliding (inertia, decay 0.9 per frame).
- **Zoom to cursor:** scroll zooms toward the point under the mouse. Pinch on touch. `+`/`−` buttons and keys.
- **Tilt with zoom:** see 4.4. Compass button removes tilt and resets north.
- **Fly-to:** parabolic path (rise, travel, descend), duration 1.2–2.6 s by distance, cubic in-out. Used for search, taps, news, Daily Brief, stories.
- **Idle:** after 20 s without input and with no panel open, the globe drifts slowly east.
- **Intro:** camera starts at 6.5 R and flies to the home view (3.4 s) while "The world, *explained.*" fades in over the globe and blurs out.
- **Reduced motion:** no intro flight, no idle drift, no arc heads, jumps instead of flights.

### 5.2 Motion tokens

| Token | Value | Use |
|---|---|---|
| fast | 150–200 ms | Hover, toggles, tooltips |
| base | 300 ms | Card fades |
| layer | 400–450 ms | Layer on/off, mode switch |
| panel | spring (`cubic-bezier(.2,1.15,.4,1)`, 500 ms) | Panel slide |
| stagger | 50 ms | Panel sections, list items |
| pulse | 1.6 s loop | Conflict ring |
| missile | 2.4–3.6 s loop | Arc head travel |
| ship | ~0.012 radians/s | Ship speed along lanes |

## 6. Components

| Component | Content | Library source |
|---|---|---|
| Header | Logo, nav (Home, Daily Brief, Stories, Glossary, Sources), search, date chip, bell, avatar | shadcn **Command** for search; nav with Motion `layoutId` underline |
| Global Pulse card | Title + Live pill, 4 layer rows with coloured icon and **switch**, hint or relation key | shadcn **Switch**; React Bits **ShinyText** for "Live" (subtle) |
| Mode card (in place of Pulse in modes) | Title, question, metric chips, colour scale, note | shadcn **ToggleGroup** |
| Mode dock | 5 buttons, active = dark pill | 21st.dev segmented control / dock + Motion `layoutId` |
| Map controls | Compass, zoom group, locate, layers | Custom round buttons |
| Markets card | 4 indices with ↗/↘, % and sparkline; "See more →" opens Economy | Custom SVG sparkline |
| Conflict callout | Dark card: flags, name, "Active • N days", chevron | Custom (HTML overlay) |
| Bloc badge | Navy medallion + emblem + label | Custom |
| Anchored card | Dark card beside the selected country with 4 quick facts, dashed connector | Custom |
| Detail panel | Kicker, title (+ flag), facts, Why it matters (numbered), news, actions | shadcn **Sheet**-like; Motion stagger; React Bits **CountUp** for big numbers |
| Daily Brief | 5 numbered stories, tap → fly | React Bits **AnimatedList** |
| Story player | Progress bars, title, caption (blur-in), prev / play / next / exit, source | Custom + React Bits **BlurText** |
| Intro title | "The world, *explained.*" | React Bits **SplitText** / **BlurText** |
| Glossary, Sources | Panel lists | shadcn |

Every 21st.dev / React Bits component is restyled to the tokens above before merge.

## 7. Screens and states

| State | Spec | Screenshot |
|---|---|---|
| Landing / Global Pulse | Intro → home view centred on Asia–Middle East–Europe; all 4 layers on | `v3-01-landing.png` |
| Country selected (Home) | Home layers fade; relation fills + arcs; anchored dark card; Relations panel (counts, filter chips, list with basis) | `v3-02-india-relations.png` |
| Zoomed in | Tilted horizon view, states, cities, clouds gone | `v3-03-zoom-states.png` |
| Conflict selected | Fly to hotspot; Conflict panel (status, days, intensity, parties with flags, Why it matters, news, Watch story) | `v3-04-conflict.png` |
| Economy mode | Choropleth, metric chips; country panel with core numbers + "what this means" + sparkline + source | `v3-05-economy.png` |
| Defense mode | Capability bars (Air / Land / Sea, "Estimate", How we calculate), nuclear block, core numbers | `v3-06-defense.png` |
| Mobile | Layers button, dock at bottom, bottom-sheet panel | `v3-07-mobile.png` |
| Story tour | Cards hidden; caption card bottom-left; highlighted countries; golden flow arcs | `#tour` |
| Loading | Globe textures fade in; markers appear when data arrives; no blocking spinner | — |
| Stale / API down | Live pill turns amber "Cached 6 h ago"; data still shown | — |
| No WebGL | 2D map fallback with the same cards | — |

## 8. News placement (every section has news)

- **Home:** bottom-right card has two tabs, **Markets** (default) and **News** (latest verified world headlines, each with section colour, time, source count; tap → fly).
- **Modes:** the left mode card ends with "Latest {mode} news" (3 items).
- **Every panel:** "Latest verified news" (3 items) for that conflict, country, bloc, summit or chokepoint.
- **Daily Brief:** top 5 stories of the day.

(The prototype shows news inside panels and the brief; the Markets/News tab is the agreed build addition.)

## 9. Interaction rules

| Input | Result |
|---|---|
| Drag | Rotate with inertia |
| Wheel / pinch | Zoom toward cursor / fingers |
| Tap country | Home: relations. Mode: country panel |
| Tap callout, glow or badge | Its panel |
| Tap empty space | Close panel |
| Hover (desktop) | Outline + tooltip; never required for information |
| `Esc` | Exit story → close panel → back to Global Pulse |
| `1`–`5` | Switch mode |
| `/` | Focus search |
| `+` / `−` | Zoom |
| `Space` | Pause / play story |

## 10. Accessibility
- All cards, callouts and badges are real buttons in the DOM with labels.
- Canvas has an `aria-label`; selection changes are announced through the panel's live region.
- Every map action is also reachable through search and lists.
- Text contrast ≥ 4.5:1 on glass; test cards over the brightest desert and cloud areas.
- `prefers-reduced-motion` fully respected (see 5.1).

## 11. Copy rules
Short, neutral, sentence case. Numbers with units and "as of" dates. Estimates and sample data always labelled. Full rules: [CONTENT-GUIDE.md](CONTENT-GUIDE.md).
