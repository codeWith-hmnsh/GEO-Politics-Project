# Statecraft — UI & Interaction Design

| Field | Value |
|---|---|
| Version | 1.0 (plan for review) |
| Date | 2026-10-10 |
| Related | [PRD.md](PRD.md) · [GAME-DESIGN.md](GAME-DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) |
| Base design (unchanged) | [`../docs/UI-DESIGN.md`](../docs/UI-DESIGN.md) · [`../all_refrence-ui/prototype-v3/`](../all_refrence-ui/prototype-v3/) · [`../all_refrence-ui/mockups/`](../all_refrence-ui/mockups/) |
| Libraries | React Bits · 21st.dev (shadcn registry) · Motion (`motion/react`) — same as 1.0 |

> **Rule:** Statecraft is the same product, not a new skin. Every token, font, radius, shadow and globe treatment from 1.0 applies. This document only adds what a game needs. If something here disagrees with 1.0, 1.0 wins unless this document names the override.

---

## 1. Design north star

**"The situation room, on paper."**

The same calm, misty paper world and the same real planet — but now it is *your* planet to run. Calm stays the default; urgency comes only from **three game signals**:

| Signal | What it is | Where it lives |
|---|---|---|
| **The clock** | Round phase timer ring | Top centre, always visible |
| **The wire** | Simulated news, typed in sepia ink | Bottom-right card, replay, Chronicle |
| **The red** | War, strikes, Tension at the brink | Globe glows, front bars, Tension meter |

Everything else is white glass, ink text and the satellite globe. If a screen feels like an arcade game, it is wrong. If it feels like a serious, beautiful dashboard with a living planet in the middle, it is right.

Feelings, in order: **gravity** (briefing: "you lead 1.4 billion people") → **control** (clear budget, clear options) → **suspense** (the replay) → **consequence** (the Chronicle).

## 2. Theme extension (tokens)

### 2.1 New colour tokens (add to `app/globals.css`, light theme only)

| Token | Value | Use |
|---|---|---|
| `--you` | `#F2B33D` (= `--gold`) | Your country outline, your seat ring, your deltas highlight |
| `--wire` | `#7A5C2E` | Simulated content: Wire text, "Simulated" stamp, Chronicle rules |
| `--wire-paper` | `#FBF7EE` | Wire card and Chronicle background (warmer than glass) |
| `--status-stable` | `#2FA36B` (= `--ally`) | Stable |
| `--status-tension` | `#E8A21C` (= `--mixed`) | Tension |
| `--status-crisis` | `#E57A3A` | Crisis (goods < 60 % or unrest) |
| `--status-war` | `#E5484D` (= `--conflict`) | War |
| `--delta-up` / `--delta-down` | `#2FA36B` / `#E5484D` | Stat changes; always with ▲ ▼ glyph |
| `--clock-calm` / `--clock-hurry` | `--ink` / `--conflict` | Timer ring (last 10 s turns red, never flashes) |
| `--tension-0…100` | `#E8ECFA` → `#9DB4F0` → `#E8A21C` → `#E5484D` → `#2A0E10` | Tension meter gradient |

Seat colours (10, colour-blind-safe; used only for avatar rings, labels and lobby chips — never for country fills, which belong to status):

`#3F63D8 #E57A3A #2FA36B #C25A84 #8C6D1F #17A2B8 #7A4FD0 #5E6B70 #D14D72 #3FA765`

### 2.2 Typography (no new fonts)
| Role | Font | Spec |
|---|---|---|
| HUD numbers | Manrope 700, `tabular-nums` | Treasury 28 px; stat values 15 px |
| Briefing title, Chronicle masthead, election result | **Fraunces** | 40–84 px; Chronicle masthead uppercase, letter-spacing .2em |
| Wire headlines | Fraunces italic 15 px, `--wire` | Typed in (see §7) |
| Timer | Manrope 700 18 px `tabular-nums` inside ring | |

### 2.3 Shape
Same radii and spacing as 1.0. Two additions:
- **Order slots:** 64 px tall rounded cards (16 px) with a dashed border when empty.
- **Stamp:** "SIMULATED" small caps, 1 px `--wire` border, radius 4, rotated −2° on the Chronicle only.

### 2.4 Iconography
Lucide for UI. Decision icons: one glyph per category, colour from the category: Domestic `Landmark`, Economy `ChartLine`, Trade `Ship`, Diplomacy `Handshake`, Military `Shield`, Intel `Eye`. Weapons are never drawn as icons of weapons on buttons — use `Target` (strike), `Anchor` (blockade), `Cpu` (cyber), `Flag` (offensive).

## 3. Screen map

```
/play                      Hub
/play/room/[code]          Lobby (country picker)
/play/match/[id]           Match (briefing → rounds → term end)
/play/match/[id]/results   Results + World Chronicle (public, shareable)
/play/daily                Daily Crisis
/play/leaderboard          Leaderboards
/play/leader/[handle]      Leader profile
/play/learn                How to play (interactive)
```
The header from 1.0 gets one new item: **Play** (with a small live dot when the player has an async turn waiting).

## 4. Screens

### 4.1 Hub — `/play`

> **Changed by D-9 (2026-10-10):** the Play page scrolls and has no mode cards. Order: Start / Create room / Join with code (hero + globe) → How it works → Pick your country (joins the live world) → match. See the updated prototype `all_refrence-ui/prototype-statecraft/`. The wireframe below is kept for the later modes.
The globe slowly turns behind; 10 seat countries are softly outlined; tiny live dots mark countries in matches right now ("312 leaders in office").

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ (●●) GeoPolitics   Explore  [Play]  Daily Brief  Stories        🔍   🔔  (M)     │
│                                                                                  │
│  STATECRAFT                                    🌍 (globe, 10 seats outlined)     │
│  Run a country.                                                                  │
│  Shape the world.          ← Fraunces 72 px, SplitText reveal                    │
│                                                                                  │
│  [▶ Quick match]  [Create room]  [Join: ______ ]                                 │
│                                                                                  │
│  ┌ Daily Crisis ─────────────┐ ┌ Continue ───────────────┐ ┌ Top leaders ─────┐  │
│  │ 🇯🇵 Japan · Energy shock   │ │ Room K7Q2M · Round 5/12 │ │ 1 🇮🇳 Riya   1842 │  │
│  │ 8 rounds · 🔥 streak 4    │ │ Your turn · 9 h left    │ │ 2 🇩🇪 Tom    1790 │  │
│  │ [Play today's crisis]     │ │ [Open]                  │ │ 3 🇧🇷 Ana    1777 │  │
│  └───────────────────────────┘ └─────────────────────────┘ └──────────────────┘  │
│                                                                                  │
│  Latest Chronicles:  "USA–India oil war ends in Moscow talks" · "No winners…"    │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- Primary CTA: dark ink pill (`--ink-strong`) with a subtle React Bits **Magnet** (≤ 6 px pull). One primary per screen.
- Latest Chronicles: horizontal marquee of Chronicle cards (paper texture), pauses on hover.

### 4.2 Lobby — `/play/room/[code]`
Choosing a country happens **on the globe**, like 1.0 country tap.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Hub      Room K7Q2M  [Copy invite link]        Standard · 12 rounds · 90 s ⚙  │
│                                                                                  │
│ ┌ Seats 4/10 humans ─┐                                    ┌ 🇮🇳 India ──────────┐│
│ │ 🇺🇸 Kabir  ✓ ready  │          🌍 globe                  │ Difficulty: Medium  ││
│ │ 🇮🇳 (you)  choosing │     taken seats: avatar pin        │ GDP $4.2T · +6.4 %  ││
│ │ 🇨🇳 Sana   ✓        │     free seats: gold dashed        │ Strong: growth,food ││
│ │ 🇷🇺 Ishan  …        │     outline + "Free"               │ Weak: oil 85 % imp. ││
│ │ 🇵🇰 Bot · Normal    │                                    │ Force ▮▮▮▮▯ Air 6.1 ││
│ │ …                   │                                    │ Nuclear ☢           ││
│ └─────────────────────┘                                    │ [Lead India]        ││
│                                                            └─────────────────────┘│
│  Bots fill free seats when the host starts.        [ Ready ]  (host: [Start ▶])  │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- Country card uses React Bits **SpotlightCard** (soft gold spotlight following the cursor, 8 % opacity) restyled to glass.
- Picking animates the seat chip from the card into the seat list (Motion `layoutId`).
- Taken: other player's avatar pin floats over their capital with seat colour ring.

### 4.3 Briefing (match start, 20 s, skippable)
Camera flies to your country (1.0 parabolic fly-to). Other cards hidden.

```
                     ┌──────────────────────────────────────────────┐
                     │  Q4 2026 · Term begins                       │
                     │  You lead  INDIA          ← Fraunces 64 px   │
                     │  1.44 billion people · GDP $4.2T             │
                     │                                              │
                     │  Your situation                              │
                     │  ① 85 % of your oil is imported              │
                     │  ② Approval 58 % · election in 6 rounds      │
                     │  ③ Pakistan border: tension                  │
                     │                                              │
                     │  National goal: Raise health above 70        │
                     │  Real world → "India's oil imports" (1.0)    │
                     │                         [ Take office ▶ ]    │
                     └──────────────────────────────────────────────┘
```
Text uses React Bits **BlurText** for lines (stagger 80 ms). Numbers count up with **CountUp**.

### 4.4 Match HUD (the main screen)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 🇮🇳 India · You     ROUND 5 / 12 · Q4 2027   ( ◔ 0:54 ORDERS )   TENSION ▁▂▃▅▆ 62   ☰  │ top bar
├───────────────────┐                                                ┌──────────────────────┤
│ CABINET           │                                                │ 🇺🇸 UNITED STATES    │
│ Treasury $41.2B ▼ │                                                │ Kabir · ● online     │
│ Approval 54 % ▲2  │          🌍  GLOBE                              │ Relation −35 hostile │
│ Growth 5.8 %   ▼  │   status fills (stable/tension/crisis/war)     │ Trust 20             │
│ Inflation 7.1 % ▲ │   seat pins with avatars                        │ Status: Tension      │
│ Debt 84 % GDP     │   trade flows (gold), sanctions (red dashed)    │ Force ~ (range)      │
│ ─ Goods ───────── │   strike arcs, blockade rings                    │ ─ Actions ─────────  │
│ ⚡ Energy  ▮▮▮▯ 71%│   front bars between warring pairs              │ [Trade ▾] [Tariff]   │
│ 🌾 Food   ▮▮▮▮ 104│                                                │ [Sanction] [Offer…]  │
│ 💾 Tech   ▮▮▯▯ 63%│                                                │ [Strike…] [Blockade] │
│ ⛏ Minerals▮▮▮▯ 88│                                                │                      │
│ ─ Force ───────── │                                                │ Why are we hostile?  │
│ Readiness 40      │                                                │ • Oil embargo (R3)   │
│ [Budget] [Projects]│                                               │ • Tariff 25 % (R4)   │
├───────────────────┘                                                └──────────────────────┤
│ ORDERS  [1 ⚡ Buy oil: Saudi]  [2 ＋ empty]  [3 ＋ empty]        [ Submit orders ✓ ]     │ order tray
│                                                    ┌ Inbox 2 ─┬ World Wire ─────────────┐│
│ Domestic · Economy · Trade · Diplomacy · Military  │ 🇷🇺 offers air defence…  [View]     ││
│ (category dock, 1.0 ModeDock style)                │ 🇵🇰 mobilises at border (R5)        ││
└────────────────────────────────────────────────────┴────────────────────────────────────┘
```

Rules:
- **Left = you** (Cabinet card, replaces 1.0 Pulse card). **Right = the other** (selected country panel, replaces 1.0 detail panel). **Bottom = your decisions** (order tray + category dock). **Bottom-right = the world talking to you** (Inbox, World Wire tabs, replaces Markets/News card). Same positions as 1.0, so 1.0 users feel at home.
- Max floating cards: Cabinet, Target panel, Order tray, Inbox/Wire + top bar. Nothing else floats.
- Every number in Cabinet is tappable → **cause chain** popover (§4.9).
- Selecting nothing on the right shows **World overview**: all 10 seats ranked by current projected score (hidden exact values for others: bands only).

### 4.5 Budget (sheet over the left side)

```
┌ BUDGET · Q4 2027 ───────────────────────────────────────────┐
│ Revenue  $96.0B   Spending $103.4B   Deficit −$7.4B  ▼     │
│ Tax level        ───────●──────  32 %   approval −1         │
│ Health      2.1 % ──────●──────  $22.1B   health ▲ +2/rnd   │
│ Education   4.6 % ─────●───────  $48.3B   (pays off in 4)   │
│ Infrastructure   ...                                         │
│ Defense     2.4 % ────────●────  $25.2B   readiness ▲       │
│ Welfare     ...                                              │
│ Research & energy ...                                        │
│ ─ Forecast next round ─────────────────────────────────────  │
│ Approval 54 → 55 ▲  Debt 84 → 85.1 % ▼  Inflation 7.1 → 7.0 │
│                                   [Reset]   [Apply ✓]        │
└──────────────────────────────────────────────────────────────┘
```
- Sliders: React Bits **ElasticSlider** restyled (thin ink track, gold thumb) — elastic overshoot only at the ends (feedback for limits).
- Forecast row updates live (engine runs client-side in forecast mode, debounced 120 ms); deltas tick with **CountUp** (300 ms).
- Baseline marker on each slider (thin tick, "today's real level").

### 4.6 Projects (sheet)
Grid of project cards (category tabs: Society · Economy · Energy · Defense). Card: icon, name, cost in $B and % GDP, build time as pips, effect line, "Needs tech ≥ 80 %" warning chip. Building projects show progress rings. Choosing one drops it into the next free order slot (Motion `layoutId` flight from card to tray).

### 4.7 Offer builder (diplomacy)

```
┌ Offer to 🇷🇺 Russia ───────────────────────────────────────────────┐
│ Type: [Request help ▾]  Military · Economic · Goods · Alliance ...  │
│                                                                     │
│   YOU GIVE                         │   YOU GET                       │
│   $8B over 2 rounds          [×]   │   Air-defence deployment  [×]   │
│   Lift tariff on Russian energy[×] │   Intel on 🇵🇰 for 3 rounds [×]  │
│   [+ add]                          │   [+ add]                       │
│                                                                     │
│ Their view: relation +40 · trust 62 · they need: Tech (63 %)        │
│ Likely response: ●●●○○ (bots only; hidden for humans)               │
│ Message: [Quick phrase ▾ "We stand together"]                       │
│                                          [Cancel]   [Send offer →]  │
└─────────────────────────────────────────────────────────────────────┘
```
- Two columns, Civ-style. Items are chips that animate between columns (Motion `layout`).
- Sending: the envelope flies from your country to theirs on the globe (gold arc, 900 ms).

### 4.8 Incoming request (modal, the "Russia decides" moment)

```
┌──────────────────────────────────────────────────────────────┐
│  🇮🇳 INDIA REQUESTS MILITARY SUPPORT          expires R6      │
│  "We stand together."                                         │
│                                                               │
│  They ask                           It would cost you         │
│  Air-defence deployment             Air defence −20 (3 rnds)  │
│  Intel on Pakistan                  Pakistan relation −20 (30 %)│
│  They offer: $8B · lift tariff                                │
│                                                               │
│  If you decline: India relation −15 · trust −20               │
│                                                               │
│     [Decline]        [Counter…]        [Accept ✓]             │
└──────────────────────────────────────────────────────────────┘
```
- Arrives with a toast first (21st.dev toast pattern / sonner, slide from bottom-right, 250 ms spring) and a soft chime; opening shows this modal (shadcn Dialog).
- **Costs are always shown before the choice.** That is the core of good decisions.

### 4.9 Cause chain ("Why did this change?")
Tap any number → popover with a vertical chain, newest at top:

```
Inflation 7.1 %  ▲ +2.3 this round
  ▲ +1.5  Energy shortage (ratio 71 %)
        ← 🇺🇸 Energy embargo (Round 3)
        ← World energy price +18 %  (🇸🇦 blockade, Round 4)
  ▲ +0.6  Fuel subsidy (your order, Round 5)
  ▲ +0.2  Tariff on US goods (your order, Round 4)
  [See on globe]  [Learn: what is an embargo? → glossary]
```
This is the educational heart: 1.0's glossary chips appear here.

### 4.10 Strike planner (deliberate friction)
1. Choose target country → camera flies there and tilts (1.0 zoom tiers).
2. Choose target type (Military base · Energy site · Infrastructure · City) → eligible cities light up as pins.
3. Panel shows: interception chance, expected hits range, **costs to you** (Tension +, reputation −, relations −), and for City targets a one-line humanitarian-law note.
4. Confirm with **hold-to-confirm** (1.2 s fill ring, Motion `useMotionValue`; releasing early cancels). No one-click war.

### 4.11 Replay (after each resolve, ≤ 20 s, skippable, speed ×2)
Events play in order of severity (war first, then trade, then domestic). Per event (~2.4 s):

| t | What happens |
|---|---|
| 0–1.2 s | Camera flies to the event (shorter hop if close) |
| 0.8–2.0 s | Globe animation: strike arc + impact ring, gold trade flow, red dashed sanction arc, blockade ring, envelope arc |
| 1.2 s | Event card (night glass, like 1.0 conflict callout) beside the place with flags + one line |
| 1.4–2.0 s | Stat delta chips pop under the card (stagger 60 ms): "Energy −12 %", "Inflation +1.5" |
| 1.6 s | Wire headline types into the Wire card (React Bits **DecryptedText**, sequential reveal, 600 ms) |

Your own country's events get a gold outline pulse. After replay, the camera returns to your view and the new round's timer starts. Reduced motion: replay becomes a vertical list of event cards with deltas.

### 4.12 Election (rounds 6 and 12)
Full-width moment (3 s): paper card with Fraunces "ELECTION · INDIA", approval bar fills to the result, verdict: "Re-elected" (ink) / "Narrow" / "Removed from office" (red rule). Other players see a small toast only.

### 4.13 Tension at the brink
- Meter in the top bar is a 5-segment bar; 75+ turns the segments red and adds a slow (4 s) breathing glow to the meter only.
- A thin red vignette (6 % opacity) at screen edges at 90+. No shaking, no sirens.
- At 100: screen fades to `--wire-paper`, globe night side, black Chronicle front page "NO WINNERS".

### 4.14 Results + The World Chronicle — `/play/match/[id]/results`

```
┌───────────────────────────────── THE WORLD CHRONICLE ──────────────────────────────────┐
│  [SIMULATED]   Match #K7Q2M · Q4 2026 – Q3 2029 · 10 leaders · 27 minutes               │
│ ════════════════════════════════════════════════════════════════════════════════════════ │
│  OIL WAR ENDS IN MOSCOW TALKS                             │  STANDINGS                  │
│  After a US embargo pushed Indian fuel prices up 40 %,    │  1 🇩🇪 Tom    744 Builder    │
│  three rounds of strikes and a Russian air-defence        │  2 🇷🇺 Ishan  701 Kingmaker  │
│  deployment, the two governments signed a ceasefire…      │  3 🇮🇳 You    668 Defender   │
│  [mini globe snapshot of final state]                     │  … 10 🇵🇰 Bot  402          │
│ ───────────────────────────────────────────────────────── │  Rating +24 (1,231)         │
│  Germany quietly builds 6 hospitals… │ Food prices hit…   │  [Rematch] [Share]          │
│ ─ TIMELINE ─────────────────────────────────────────────────────────────────────────── │
│  R3 🇺🇸 embargo → R4 🇮🇳 tariff → R5 🇮🇳 strike → R6 🇵🇰 offensive → R6 🇷🇺 accepts help → … │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- Chronicle look: `--wire-paper` background, Fraunces masthead, 3-column newspaper grid on desktop, single column on mobile, thin `--wire` rules, the SIMULATED stamp.
- Your result card (left of standings on desktop): Leader Score with **CountUp**, 5-dimension radar (custom SVG, 1.0 sparkline style), titles as chips, start → end stats.
- Share image via Next.js `opengraph-image` (Chronicle masthead + headline + standings + SIMULATED).

### 4.15 Leaderboards and profile
- Tabs (shadcn Tabs with Motion `layoutId` underline): Global · Season · By country · Daily · Friends.
- Rows: rank, flag, name, tier badge, rating, sparkline of last 10 matches. Top 3 get a subtle gold/silver/bronze left rule — no trophies or confetti.
- Profile: header (name, tier, rating, titles), **Country dossier** card (best match: GDP, growth, debt, health, education, force bars, alliances), match history list linking to Chronicles.

### 4.16 How to play
5 steps with React Bits **Stepper**: Budget → Decide → Offer → Watch the replay → Get scored. Each step is interactive on a mini sandbox (engine running locally). 90 seconds total.

## 5. Globe in the game

| Layer (new or reused) | Look | Source |
|---|---|---|
| Status fills | Country fill by status at 35 % opacity (stable none, tension amber, crisis orange, war red) — one choropleth at a time rule kept: status is the game's only fill | `DataOverlay` |
| Your country | Gold outline (1.0 selected style) + soft gold rim | `Borders` |
| Seat pins | Avatar (28 px) with seat colour ring over capital; bot = monogram; offline = 40 % opacity | `MarkerOverlay` (DOM) |
| Supply contracts | Gold dashed flowing lines with good icon chip at midpoint | `TradeLayer` |
| Sanctions / embargoes | Red dashed arcs, sanctioner → target | `SanctionsLayer` |
| Strikes | 1.0 missile arc + impact ring, labelled Simulated in panels | `WarsLayer` |
| Blockade | Dotted red ring around target coast, ship icons halted | new `BlockadeLayer` |
| Front bar | Small DOM bar between capitals of warring pair (flags at ends, fill = front) | new `FrontMarkers` |
| Alliances | Thin green arcs between allies (only when either is selected) | `RelationsLayer` |
| Offers in flight | Envelope travelling on a gold arc during replay | new `OfferArc` |

Budgets from 1.0 still apply (≤ 12 arcs on screen; replay focuses camera so most effects are near).

## 6. Components

| Component | Content | Source |
|---|---|---|
| `TopBar` | You, round/quarter, phase timer ring, Tension meter, menu | Custom; timer ring SVG + Motion |
| `PhaseTimer` | Ring + seconds; "Waiting for 3 leaders" after submit | Custom |
| `TensionMeter` | 5 segments + number | Custom |
| `CabinetCard` | Treasury, approval, growth, inflation, debt, goods bars, force | 1.0 glass card; React Bits **CountUp** for values |
| `CauseChain` | Popover chain | shadcn Popover + Motion stagger |
| `TargetPanel` | Country summary, relation, trust, actions, "why hostile" | 1.0 PanelHost pattern |
| `OrderTray` | 3–4 slots, submit | Custom; Motion `layoutId` from sources; Reorder (Motion `Reorder.Group`) to reorder |
| `CategoryDock` | Domestic · Economy · Trade · Diplomacy · Military | 1.0 `ModeDock` reused |
| `BudgetSheet` | Sliders + forecast | shadcn Sheet + React Bits **ElasticSlider** |
| `ProjectGrid` | Project cards | shadcn Tabs + cards; 21st.dev "Cards" patterns restyled |
| `OfferBuilder` / `OfferModal` | Give/get columns | shadcn Dialog + Motion `layout` |
| `Inbox` | Requests list | React Bits **AnimatedList** (1.0 already installed) |
| `WireFeed` | Simulated headlines | React Bits **DecryptedText** (reveal once, then static) |
| `Toast` | Alerts | sonner via shadcn (21st.dev Toasts category patterns) |
| `HoldToConfirm` | 1.2 s ring | Custom, Motion `useMotionValue` + `animate` |
| `SeatList`, `CountryPickCard` | Lobby | React Bits **SpotlightCard**; 21st.dev Avatars/Avatar Group |
| `ReplayDirector` | Sequences camera + layers + cards | Custom; Motion `animate()` sequences |
| `Chronicle` | Newspaper page | Custom; Fraunces; CSS grid |
| `ScoreRadar` | 5-dimension radar | Custom SVG |
| `Leaderboard` | Table + tabs | shadcn Table/Tabs; 21st.dev Tables patterns |
| `TutorialStepper` | How to play | React Bits **Stepper** |
| `HeroTitle` | Hub title | React Bits **SplitText** (1.0 intro) |
| `RollingTreasury` | Treasury digits roll on change | React Bits **Counter** (Motion's `AnimateNumber` is Motion+ paid — not used) |

Every React Bits / 21st.dev piece is restyled to the tokens before merge (1.0 rule). Install React Bits pieces into `components/bits/` like 1.0.

## 7. Motion

### 7.1 New motion tokens
| Token | Value | Use |
|---|---|---|
| `order-drop` | spring (stiffness 420, damping 32) | Card → order slot flight |
| `delta-pop` | 180 ms scale .8 → 1, stagger 60 ms | Stat delta chips |
| `number-tick` | 300 ms (forecast), 600 ms (resolve) | CountUp / Counter |
| `wire-type` | 600 ms sequential reveal | Wire headline |
| `replay-event` | 2.4 s per event (§4.11), ×2 speed option | Replay |
| `hold-confirm` | 1.2 s linear | Strike confirm |
| `toast-in` | 250 ms spring from bottom-right | Requests |
| `phase-swap` | 400 ms crossfade of tray ↔ replay cards | Phase changes |
| `brink-breathe` | 4 s ease-in-out loop | Tension ≥ 75 meter glow only |

### 7.2 Motion rules
1. Motion explains causality: something moves **from** the cause **to** the effect (offer envelope, trade flow, strike arc, delta chips under the event).
2. No idle loops on HUD except the timer ring and brink glow.
3. Numbers never jump: they tick (CountUp/Counter).
4. Only one camera move at a time; the replay director owns the camera during replay, the player owns it otherwise.
5. `prefers-reduced-motion`: no camera flights (cuts), no arc heads, no typing, deltas appear instantly, replay as list.

### 7.3 Sound (P1, off by default on first visit, toggle in menu)
Soft paper tick on slot drop · teletype tick on Wire line · low single chime on incoming request · muted heartbeat at Tension ≥ 90. No explosions.

## 8. States

| State | Behaviour |
|---|---|
| Orders submitted | Tray locks (ink check), timer label "Waiting for 3 leaders"; you can still answer offers |
| Resolving | Timer ring becomes indeterminate (≤ 2 s); never a blocking spinner |
| Reconnecting | Top bar pill "Reconnecting…" (amber); state refetched on return |
| Caretaker | Your seat shows "Caretaker (bot)" to others; you see "You were away — bot played round 7" with its decisions |
| Removed from office | Grey overlay on Cabinet, "Watch the rest" spectator mode |
| Async waiting | Hub "Continue" card with time left; email/push when it is your turn |
| Catastrophe | §4.13 |
| Weak device | 1.0 lite globe tier; replay uses fewer arcs; Chronicle unaffected |

## 9. Mobile (< 760 px)
- Top bar: flag, round, timer ring, Tension (compact).
- Cabinet becomes a **peek sheet** at the bottom (vaul drawer, 1.0): collapsed shows Treasury · Approval · worst good; drag up for full.
- Target panel = bottom sheet (62 % max height, 1.0 rule).
- Order tray = sticky bottom bar with 3 slot dots + Submit; category dock scrolls horizontally above it.
- Replay: camera moves are shorter, event card docks at the bottom instead of beside the place.
- Tap targets ≥ 44 px; hold-to-confirm ring 64 px.

## 10. Accessibility
- All of 1.0's rules (real DOM buttons, labels, contrast on glass, keyboard path, reduced motion).
- **Timing adjustable (WCAG 2.2.1):** Relaxed speed (180 s rounds), Async rooms; host can pause a private room (30 s × 3 per match).
- Phase changes, incoming requests and replay events announced via an `aria-live="polite"` region; war and Tension brink via `assertive`.
- Status never colour-only: each status has an icon (●, ▲ tension, ⚠ crisis, ✕ war) in lists and tooltips.
- Keyboard: `1–5` categories, `B` budget, `P` projects, `Enter` submit, `Esc` close, `Space` skip replay event, `?` shortcuts.

## 11. Copy rules (additions to 1.0 CONTENT-GUIDE)
- Second person for the player ("Your approval fell 4 points"), neutral third person for the world.
- Costs shown in the same sentence as the action ("Sanction Russia — your exports −8 %, relation −30").
- War copy: "strike", "damage", "estimated casualties (simulated)". Never "destroyed", "obliterated", "victory!".
- Bots are "Caretaker government of …".
- Every simulated surface carries "Simulated".

## 12. Reference study

Sites checked on 2026-10-10 for this plan:

| Reference | What we take |
|---|---|
| **motion.dev** (Motion for React docs) | `layout` / `layoutId` shared-element moves (card → order slot, seat chip), `AnimatePresence` exits (toasts, replay cards), `useMotionValue` for hold-to-confirm, SVG `pathLength` for timer and radar. Note: `AnimateNumber` is Motion+ only — we use React Bits counters instead. |
| **21st.dev** community registry | Category patterns to adapt: Toasts, Notifications ("Live notification feed"), Avatars / Avatar Group, Numbers, Progress / Meter, Steppers, Tables, Docks, Dialogs. Restyle to tokens; no marketing-style heroes inside the game. |
| **React Bits** (reactbits.dev — page renders client-side; names checked against the components already installed in 1.0) | Already installed: SplitText, BlurText, CountUp, AnimatedList, ShinyText. To add: DecryptedText (wire), Counter (treasury), ElasticSlider (budget), SpotlightCard (country pick), Stepper (tutorial), Magnet (one primary CTA). Verify each name at install time. |
| Google 3D Maps demo (1.0 motion reference) | Camera feel for briefing and replay fly-tos (unchanged) |

Game design references (design study, not visited for this plan): **Democracy 4** (policy sliders with visible cause-and-effect → our budget forecast and cause chain), **Plague Inc.** (globe + news ticker as consequence feedback → World Wire), **Civilization VI/VII** (give/get diplomacy screen → offer builder), **Twilight Struggle** (DEFCON track → Tension meter), **Conflict of Nations / webDiplomacy** (async rounds, simultaneous orders, notifications), **Football Manager** (inbox-driven decisions → Inbox).

## 13. Prototype plan
Before G2, build `all_refrence-ui/prototype-statecraft/` (static HTML like v3) with deep links `#hub`, `#lobby`, `#briefing`, `#hud`, `#budget`, `#offer`, `#request`, `#strike`, `#replay`, `#chronicle` and screenshots in `all_refrence-ui/mockups/sc-*.png`. Once approved, the prototype becomes the source of truth for the game's look, as v3 is for Explore.
