# Statecraft 4.0 — UI, Motion and Game Feel

| Field | Value |
|---|---|
| Version | 4.0 (final, 2026-10-11) |
| Date | 2026-10-11 |
| Related | [GAME-DESIGN](GAME-DESIGN.md) · [ACTIONS](ACTIONS.md) · [ENGAGEMENT](ENGAGEMENT.md) |
| Base design (unchanged) | [`../docs/UI-DESIGN.md`](../docs/UI-DESIGN.md) · [`../all_refrence-ui/prototype-v3/`](../all_refrence-ui/prototype-v3/) · [`../all_refrence-ui/mockups/`](../all_refrence-ui/mockups/) · tokens in `app/globals.css` |
| Earlier game UI | [2.0 UI-DESIGN](../docs2.0/UI-DESIGN.md) (tokens §2 still apply) · prototype [`../all_refrence-ui/prototype-statecraft/`](../all_refrence-ui/prototype-statecraft/) |

> **Goal:** a game that looks and moves at the level of the best product sites, built on the 1.0 globe and the paper theme. It must feel like a **game** — clear goals, instant feedback, satisfying reveals — and never like a messy dashboard.

---

## 1. North star

**"The situation room, on paper — and it plays like a game."**

The same calm paper world and the same real planet as 1.0. Now the planet is yours to run. The calm is the default. Excitement comes from **moments**, not from noise:

| Moment | Feeling | Design tool |
|---|---|---|
| Briefing | Gravity: "You lead 1.46 billion people" | Fraunces title, camera fly-to, advisors |
| Planning | Control | One clear panel, live forecast, orders tray |
| Lock | Commitment | Stamp, sound, cards flip face down |
| Reveal | Suspense, surprise | Six moves flip together, globe choreography |
| Result | Reward or lesson | Numbers count, rank reorders, Why chain draws |
| Match end | Pride, story | Crown, history timeline, share card |

If a screen feels like an arcade, it is wrong. If it feels like a spreadsheet, it is also wrong. It is right when a first-time player knows **what to do next** in under 3 seconds and the result of every action is **visible and explained**.

## 2. Reference study

| Reference | Lesson we take |
|---|---|
| [Motion](https://motion.dev) (`motion/react`, already in the repo) | `layout` and `layoutId` for panels and the ranking reorder; `AnimatePresence` with stable keys for exits; springs instead of fixed easing; `useScroll` + `useTransform` for the Play page; `whileInView` with `once: true` for section reveals. |
| [React Bits](https://reactbits.dev) (5 components already in `components/bits/`) | Text and number animation (SplitText, BlurText, CountUp, Counter), interactive cards (SpotlightCard, TiltedCard), ElasticSlider for the budget, ClickSpark for confirmations, Stepper, ScrollReveal. Installed per component through the shadcn CLI in the TS + Tailwind variant. |
| [21st.dev](https://21st.dev) | A registry of community shadcn components installable with `npx shadcn add <url>`. We use it as a **source** for specific parts (animated tabs, timeline, leaderboard rows, bento sections), then restyle them to our tokens. |
| [Magic UI](https://magicui.design) | NumberTicker, AnimatedBeam (for the Why chain connectors), BorderBeam (the active step), Marquee (history cards on the Play page), Confetti (match win only). |
| Google 3D Maps demo (`all_refrence-ui/refrence-website-links.txt`) | Camera moves that are slow, smooth and meaningful; labels that stay readable while the globe moves. |
| Civilization VII, Polytopia | Strategy UI succeeds when the player always sees: whose turn, what is left to do, what changed. Polytopia shows that very few elements are enough. |
| Mini Metro | Calm visuals, very few colours, and satisfaction from a system working. |
| Democracy 4 | Sliders with instant ripple preview. We show three effects, not the whole web. |
| Reigns | One decision, one tap, instant consequence — our crisis cards. |
| Clash Royale chests, Balatro scoring | The reveal is a sequence, with numbers that count and grow. Reward timing matters more than effects. |
| Game-feel research | Feedback must be scaled to the moment. Too much "juice" hides information, especially in strategy games. Responsiveness first, effects second. |

## 3. The ten "not messy" rules

1. **One job per screen area.** Globe = world. Right panel = your decisions. Left rail = the other leaders. Top bar = time and resources. Nothing moves between areas.
2. **One primary button per view.** In a turn it is **Lock turn**. Everything else is secondary or ghost.
3. **Never more than 7 choices at once** (the 5–7 cards). The full list lives in a drawer.
4. **Every number has a direction:** value + delta + ▲▼ glyph + colour. Colour is never the only signal.
5. **Every change has a reason** one tap away (Why).
6. **Same place, same thing.** Treasury is always top-left in the bar; PC dots always next to it; the timer always top-centre.
7. **Plain words.** "Energy supply 88%" not "E-ratio 0.88". Jargon only inside term chips that explain themselves.
8. **No more than 2 toasts on screen.** Others queue. Toasts never cover the Lock button.
9. **Motion explains change.** A number that changes counts. A panel that opens grows from its button. Decoration-only animation is not allowed in a turn.
10. **Empty, loading and error states are designed**, never blank.

**Layer discipline on the globe.** During planning the globe shows only: your gold outline, your own flows and project pins, and the target arc of the card you are setting. The influence map, all treaties, all sanctions and event pins appear in the reveal and in **World view** (toggle `V`). The planet is never covered by everything at once.

## 4. Theme

### 4.1 Reused from 1.0 (no change)

`--paper #f3f1ec`, `--paper-2`, `--ink #11232b`, `--ink-2`, `--ink-3`, `--glass` white 86%, `--shadow-card`, `--conflict`, `--ally`, `--neutral`, `--mixed`, `--gold`, radius `0.75rem`, Manrope (UI) and Fraunces (display). Light theme only, as approved for 1.0.

### 4.2 Game tokens (add to `app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--you` | `#F2B33D` (= `--gold`) | Your country outline, your rank row, your deltas |
| `--wire` / `--wire-paper` | `#7A5C2E` / `#FBF7EE` | World News and history cards (warm "newspaper" paper) |
| `--delta-up` / `--delta-down` | `#2FA36B` / `#E5484D` | Stat changes, always with ▲▼ |
| `--clock-calm` / `--clock-hurry` | `--ink` / `--conflict` | Timer ring; last 10 s turn red, never flash |
| `--status-stable / tension / crisis` | `#2FA36B` / `#E8A21C` / `#E57A3A` | Country status chip and globe fill |
| `--group-economy` | `#3F63D8` | Card group accents (top border 3 px, icon) |
| `--group-trade` | `#17A2B8` | |
| `--group-energy` | `#E8A21C` | |
| `--group-food` | `#5E9E3A` | |
| `--group-people` | `#C25A84` | |
| `--group-diplomacy` | `#7A4FD0` | |

**Seat colours** (6, colour-blind safe, for avatar rings, rank rows and arcs only — country fills belong to status): India `#E57A3A`, China `#D14D72`, USA `#3F63D8`, Russia `#5E6B70`, Saudi `#2FA36B`, Japan `#7A4FD0`.

### 4.3 Typography

| Role | Font | Spec |
|---|---|---|
| HUD numbers | Manrope 700, `tabular-nums` | Treasury 22 px; stats 15 px; deltas 13 px |
| Year and titles | Fraunces | "2029" 40 px in the briefing; Play page hero 64–88 px |
| News headlines | Fraunces italic 16 px, `--wire` | Typed in during the reveal |
| Card names | Manrope 700 15 px | |
| Body | Manrope 400/500 14–16 px | Minimum 14 px in a turn, 16 px on mobile |

### 4.4 Surfaces

- **Glass card** (1.0): white 86%, blur 16 px, `--shadow-card`. Used for every panel.
- **Paper card** (`--wire-paper`, 1 px `--wire` at 20%): news, history, share card. It signals "simulated story".
- **Action card**: white, radius 14, 3 px top border in the group colour, icon top-left, PC cost pips top-right.
- **Stamp**: "LOCKED", "COMPLETED", "SIMULATED" in small caps, 1.5 px border, rotated −3°.

## 5. Screens

### 5.1 Screen map

```
/play                       Play page (scrollable landing + Start)
/play/queue                 Quick Match search (overlay on /play)
/play/room/[code]           Private room lobby
/play/match/[id]            Match (briefing → 12 turns → end)
/play/match/[id]/history    Public read-only history + share card (OG image)
/play/learn                 How to play (interactive, also the tutorial entry)
```

The 1.0 header gets **Play** with a small live dot ("leaders online").

### 5.2 Play page — `/play` (scrollable)

A long, smooth page in the 1.0 style. The globe stays fixed behind the first sections and reacts to scroll. Sections reveal with `whileInView` (once). Smooth scrolling is native CSS (`scroll-behavior: smooth`); no scroll-jacking.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ (●●) GeoPolitics   Home  Daily Brief  Stories  [Play •]        🔍  (M)       │
│                                                                              │
│  STATECRAFT · Multiplayer                                 🌍 globe (fixed),  │
│  Run a country.                        ← Fraunces 88, SplitText              │
│  Shape the world.                                          6 seat countries  │
│  Six leaders. Twelve years. One shared world.              softly outlined,  │
│                                                             live dots       │
│  [ ▶ Start ]   [ Create room ]   [ Join: _ _ _ _ _ ]                          │
│  ● 214 leaders in office now · ~22 min per match                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1  HOW A YEAR WORKS  (sticky scroll story, 4 steps; globe animates each)     │
│    ① Briefing  ② Budget  ③ Build  ④ Act & negotiate  →  Lock  →  The world   │
│    left: step text pins while scrolling · right: globe + a live mini-UI demo │
├──────────────────────────────────────────────────────────────────────────────┤
│ 2  WHO WILL YOU LEAD?   6 TiltedCards: flag, mission, strengths, difficulty  │
│    hover: globe flies to the country · tap: "Lead India" (pre-selects seat)  │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3  EVERY CHANGE HAS A REASON   animated Why-chain demo (AnimatedBeam)        │
├──────────────────────────────────────────────────────────────────────────────┤
│ 4  RANK 1 IS EARNED   Power Index demo: rows reorder as you scroll          │
├──────────────────────────────────────────────────────────────────────────────┤
│ 5  WORLDS PLAYERS MADE   Marquee of real share cards (paper texture)         │
├──────────────────────────────────────────────────────────────────────────────┤
│ 6  LEARN BY LEADING   3 short tiles: concepts you meet (sanctions leakage…)  │
├──────────────────────────────────────────────────────────────────────────────┤
│ 7  FAQ (accordion) · final CTA [ ▶ Start ] · footer                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Start** = Quick Match (§5.3). Create room / Join with code as decided in D-9.
- The hero CTA uses React Bits **Magnet** (≤ 6 px pull) and **ClickSpark** in `--gold`.
- Section 1 is the key teaching moment: a **sticky scroll story** (Motion `useScroll` on the section; each step at 25% progress swaps the demo). On mobile it becomes four stacked cards with the same demo images.
- The globe on this page runs at reduced quality (no clouds layer) to keep scroll at 60 fps; it pauses when out of view.

### 5.3 Quick Match search (overlay)

```
            ┌───────────────────────────────────────────┐
            │  Finding your world…            ◔ 0:12    │
            │                                           │
            │  Your pick:  🇮🇳 India  (1st)  🇯🇵 Japan (2nd) │
            │                                           │
            │  ○ ○ ● ● ● ○   3 of 6 leaders found         │
            │                                           │
            │  Bots join at 0:40 so you never wait long │
            │            [ Cancel ]   [ Play now with bots ]│
            └───────────────────────────────────────────┘
```

- Seat dots fill with Motion `layout` as players join. Each join plays a soft tick.
- "Play now with bots" starts at once with the humans already found.

### 5.4 Room lobby — `/play/room/[code]`

Same layout as 2.0 §4.2, with 6 seats. The country is picked **on the globe** or from the 6 cards. Taken seats show the player's avatar pin. The host has **Start**; bots fill free seats.

**Leader identity** ([GAME-DESIGN §17](GAME-DESIGN.md#17-leader-identity)): a small card above the seat list with the leader name field and 8 portrait styles in a row (illustrated, flat, on paper colours). The choice is remembered for the next match. Quick Match uses the saved identity, so it adds no step.

### 5.5 Match layout (desktop ≥ 1200 px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🇮🇳 INDIA  $96B  PC ●●●○   │   2029 · Turn 4/12   ◔ 0:54   │  Power #3 ▲1  🔊 ⚙ │  top bar
├───────────────┬──────────────────────────────────────────┬───────────────────────┤
│ WORLD         │                                          │ ① Brief ② Budget      │
│ Power Index   │                                          │ ③ Projects ④ Actions  │
│ 1 🇺🇸 79  ●   │                                          │ ⑤ Diplomacy           │
│ 2 🇨🇳 77  ●   │              ( GLOBE )                   │───────────────────────│
│ 3 🇮🇳 74  ◐   │     your country gold outline            │                       │
│ 4 🇯🇵 66  ●   │     flows, arcs, project pins            │   step content        │
│ 5 🇷🇺 61  ○   │                                          │   (§5.6 – §5.10)      │
│ 6 🇸🇦 58  ●   │                                          │                       │
│ ● locked ○ thinking                                      │───────────────────────│
│───────────────│                                          │ Orders · PC ●●○ $B −29│
│ Treaties (4)  │                                          │ [Budget ✎][Reserve ✎] │
│ Sanctions (1) │                                          │ [Deal→RUS ⏳]   [+]    │
│ Tariffs (2)   │  ┌ News · 2028 ─────────────────────┐    │                       │
│ [World Table] │  │ India–Russia oil pact holds …    │    │      [ Lock turn ]    │
└───────────────┴──┴──────────────────────────────────┴────┴───────────────────────┘
   left rail 260 px              globe (flex)                    command panel 400 px
```

- **Top bar:** your flag and name, treasury (CountUp on change), PC dots, year and turn, timer ring, Power rank with change, sound and settings.
- **Left rail (the others):** live Power ranking with each leader's portrait, lock status (● locked, ○ thinking, ◐ you) and a trend chip. Below it, counts of treaties, sanctions, tariffs and regions led; **World Table** opens the full table as a sheet.
- **Command panel (you):** a 5-step tab bar. Steps are a guide, not a gate: any step can be opened in any order. A step you have touched shows a small check. The **active step** has a BorderBeam (Magic UI) at low opacity.
- **Orders tray** ([ACTIONS §7](ACTIONS.md#7-orders-tray)) is pinned at the bottom of the panel, above **Lock turn**.
- **News card** (paper) bottom-left of the globe shows last year's top 3 headlines; it collapses to one line during planning. Each headline has an event icon, a place and the year; tapping it flies the camera to that place and shows the pin (Liveuamap pattern). Never more than 3 items, then "More".
- Keyboard: `1`–`5` steps, `A` all actions, `W` world table, `L` lock (no confirmation, because doing nothing is a valid turn), `Esc` closes a sheet, `?` help.

#### 5.5.1 Brief

```
┌ 2029 ───────────────────────────────────────┐
│ ┌ WORLD VOTE · 20 s ────────────────────────┐│  (turns 3, 6, 9 only)
│ │ Oil price cap at 115 for 3 years          ││
│ │ Good for: importers · Bad for: exporters  ││
│ │   [ Yes ]   [ No ]   [ Abstain ]          ││
│ └───────────────────────────────────────────┘│
│ DROUGHT IN THE GRAIN BELT     ← Fraunces 22 │
│ China's harvest −12%. Food price +9%.       │
│ ⚠ Prices rising: inflation 8.4% next year   │  (max 2 warnings)
│   [Austerity Drive] [Cut Tariffs]           │
│                                             │
│ ┌ CRISIS · your call ───────────────────────┐│
│ │ Rice exports: China asks to buy 3 units.  ││
│ │ (A) Sell at +15%   (B) Hold for home      ││
│ │ (C) Sell for a 3-year tariff cut          ││
│ └───────────────────────────────────────────┘│
│ 🧑‍💼 Finance  "Selling now pays $6B."          │
│ 🌐 Foreign  "China will remember (C)."       │
│ 👥 People   "Food inflation is 5.8%."         │
│ Your mission: Top-3 Power · unemployment<6% │
│ ████████░░ on track                          │
└─────────────────────────────────────────────┘
```

- **World Vote** card sits on top only on vote turns. Its 20 s ring is separate from the turn timer. The vote is hidden until the reveal; after voting the card shrinks to one line ("You voted Yes").
- **Warnings** are amber lines with a ⚠ icon and the suggested cards as chips; tapping a chip opens that card in Actions.
- Crisis choices are big tap targets with a one-line forecast under each.
- Advisor lines appear with a 120 ms stagger (AnimatedList).
- Term chips (dotted underline) open a small popover from the glossary.

#### 5.5.2 Budget

```
┌ Budget 2029 ─────────────── Revenue $812B ───┐
│ Tax  ───────●──────  19%   approval −1        │
│                                              │
│ Industry & Jobs   ──────●───   $96B  ▲ +8    │
│ Infrastructure    ─────●────   $84B          │
│ Agriculture       ───●──────   $31B          │
│ Energy            ─────●────   $62B  ▲ +8    │
│ Education         ────●─────   $142B         │
│ Health & Welfare  ─────●────   $180B         │
│ Defence           ───●──────   $66B  ▼ −16   │
│ Reserve (unspent)               $22B         │
│ ─────────────────────────────────────────────│
│ Forecast next year                            │
│ Unemployment ▼0.2 · Energy ▲3 · Security ▼2  │
│ [Reset to last year]                          │
└──────────────────────────────────────────────┘
```

- Sliders are React Bits **ElasticSlider** restyled (ink track, gold thumb for changed rows). Values in $B with `tabular-nums`; the change from last year shows as a delta.
- A stacked bar above the sliders shows the split of the budget. It animates with `layout` when values change.
- The forecast line updates with a 150 ms debounce. It shows the **three biggest** effects only.
- Moving a slider never needs PC.

#### 5.5.3 Projects

```
┌ Projects ── Slots ● ● ○  (3rd at GDP +25%) ─┐
│ Building                                     │
│ ┌ Semiconductor Fab ─────── 2 / 4 ▓▓░░ ─────┐│
│ │ Tech +12% when complete · $10B / turn     ││
│ └───────────────────────────────────────────┘│
│ Start a project                               │
│ ┌ Refinery ┐ ┌ Port Hub ┐ ┌ Solar ┐ ┌ More ▸ ┐│
│ │ $17B·2t  │ │ $21B·2t  │ │ $25B·2t│        ││
│ └──────────┘ └──────────┘ └───────┘        ││
└──────────────────────────────────────────────┘
```

- Project tiles use React Bits **SpotlightCard** (soft gold, 8% opacity).
- Starting a project: the tile shrinks into the slot (`layoutId`) and a pin drops on the globe at the site.
- **Completion** (during the reveal): pin pulses gold three times, a "COMPLETED" stamp lands on the tile with a spring, a soft chime. This is the main "I built it" moment — kept short (≤ 1.2 s).

#### 5.5.4 Actions (cards)

```
┌ Actions ───────────── suggested for 2029 ───┐
│ ┌ ENERGY ──── ● ┐ ┌ FOOD ────── ● ┐ ┌ TRADE ●● ┐│
│ │ Secure Oil     │ │ Release Grain  │ │ Sanction  ││
│ │ Imports        │ │ Reserves       │ │           ││
│ │ Russia ▾ 4u ▾  │ │ free           │ │ Russia ▾  ││
│ │ fcst: energy▲5 │ │ fcst: food ▲6  │ │ fcst: …   ││
│ └────────────────┘ └────────────────┘ └───────────┘│
│ ┌ PEOPLE ─── ● ┐ ┌ ECONOMY ── ● ┐ ┌ ✚ Propose deal ┐│
│ └──────────────┘ └─────────────┘ └────────────────┘│
│ [ All actions (33) ▸ ]                            │
└──────────────────────────────────────────────────┘
```

- Cards enter with a 40 ms stagger. Hover lifts 2 px with a soft shadow; no tilt in the turn (tilt is for the Play page).
- Playing a card: it flies into the orders tray (`layoutId`), PC dots drain with a short spring.
- A card with a target shows a dashed preview arc on the globe while it is being set.
- **All actions** opens a right sheet with the six groups and a search box (`cmdk`). Locked cards are dimmed with the reason.

#### 5.5.5 Diplomacy

```
┌ Diplomacy ───────────────────────────────────┐
│ Inbox (2)                                    │
│ ┌ 🇺🇸 USA proposes ─────────────────────────┐ │
│ │ Gives: 3 tech units/turn −10%  · 4 turns  │ │
│ │ Wants: cut Russian oil to 2 units         │ │
│ │ Trust: USA 62 ●●●○                         │ │
│ │ [Accept] [Counter] [Reject]                │ │
│ └───────────────────────────────────────────┘ │
│ Your proposals                                │
│ 🇷🇺 Russia · oil deal · ⏳ thinking…            │
│ [ ✚ New proposal ]                             │
└──────────────────────────────────────────────┘
```

- The composer is a 3-row card: **Gives / Wants / Duration**, each row a set of chips (good, units, price, money, pledge). A live "Value for them" meter shows how attractive the offer is likely to be for a bot (from the bot utility). This teaches negotiation.
- Bot answers arrive in 1–2 s with a typing indicator; the answer flips the card (`rotateY`, 300 ms).
- A **Counter** shows the changed fields highlighted in `--mixed`.
- New inbox items pulse the step tab once and play a soft knock.

### 5.6 Lock and waiting

- **Lock turn** → the orders tray cards flip face down, a "LOCKED" stamp lands, the button becomes "Waiting for 2 leaders".
- The left rail shows who is still thinking. The globe slowly drifts; small "thinking" dots pulse over unlocked capitals.
- A locked player can **unlock** until everyone is locked or time runs out.
- Last 10 s: the timer ring turns `--clock-hurry`, one soft tick per second. No flashing.

### 5.7 The reveal (resolution replay)

Built as one **GSAP timeline** (`gsap` and `@gsap/react` are already in the repo), so it can be paused, sped up (×2) and skipped. UI pieces inside it use Motion. Total ≈ 15–17 s.

| t (s) | Beat | What happens |
|---|---|---|
| 0.0 | Lock out | Panels slide out (Motion), the globe takes the full screen, camera pulls back to the world view |
| 0.6 | **The six moves** | Six small cards (one per country) appear in a row and flip together. Each shows the country's headline move. The suspense moment. |
| 2.5 | Flows | Treaty flows draw as animated lines (energy amber, food green, tech blue). Sanction arcs draw in red, dashed. |
| 5.0 | Event | If a world event happens, the camera flies to it, a paper card types the headline |
| 7.0 | Markets | A price strip at the top: Oil 112 → 104 ▼, Food 109 ▲. Numbers roll (Counter). |
| 7.8 | **World Vote** (vote turns) | Six portraits with their vote flip at once; "PASSED 4–2" or "FAILED" stamp |
| 8.3 | **Influence** | Regions whose leader or strength changed re-tint: the new colour spreads from the region's centre outward (shader blend, 800 ms). A region you just took gets a soft gold rim pulse. |
| 9.5 | Back to you | Camera returns to your country. Projects complete here (§5.5.3) |
| 10.5 | **Your numbers** | Result sheet rises (§5.8). Deltas count up one after another (80 ms stagger), each with its trend chip |
| 13.0 | **The ranking** | Power Index rows reorder with Motion `layout` (spring). Your row glows gold if you climbed. |
| 14.5 | News | Three headlines type in on the paper card |
| 16.0 | Next | "2030 begins" — the briefing for the next turn |

- Every beat is skipped if it has nothing to show (no event, no completion).
- **Forecast vs actual:** when your main forecast differed by more than 25%, a line shows it: "Forecast: energy ▲9. Actual: ▲5 — US sanctions delayed 1 unit." This is a key hook.

### 5.8 Turn result and the Why chain

```
┌ 2029 · Your year ────────────────────────────┐
│ Energy security   71  ▲ 9   [Why]            │
│ Industry          70  ▲ 2   [Why]            │
│ Unemployment     7.1% ▼0.3  [Why]            │
│ Treasury        $96B  ▼ 22  [Why]            │
│ Russia relations  58  ▲ 8                     │
│ Power rank        #3  ▲ 1                     │
│ [See all changes]                 [Continue ▸]│
└──────────────────────────────────────────────┘
```

**Why chain** opens in place (the row expands, the rest dims):

```
  ┌───────────────────┐
  │ Russia oil treaty │ ← your move   (avatar chip: India)
  └─────────┬─────────┘
            │  (AnimatedBeam draws downward, 250 ms per link)
  ┌─────────▼─────────┐
  │ Energy supply      │ 88% → 97%
  └─────────┬─────────┘
  ┌─────────▼─────────┐
  │ Fuel shortage      │ penalty removed
  └─────────┬─────────┘
  ┌─────────▼─────────┐
  │ Industry ▲ 2       │
  └───────────────────┘
  Also: US sanctions on Russia (USA's move) · −1 unit delayed
  Learn: [energy security] [sanctions leakage]
```

- Root causes show who caused them (your move, another leader's move, an event, the market).
- The top 3 contributors only. "Other effects" folds the rest.
- Each node is tappable to see its own chain, so the player can walk back as far as they want.

### 5.9 Match end

1. **Final reveal:** the Power Index reorders one last time. Then the Leader Score columns count up (NumberTicker), lowest first. The winner's row expands with a crown; **Confetti** only for the winner and only once.
2. **Your summary:** score breakdown as a horizontal stacked bar (improvement, mission, rank climb, objectives), with tooltips.
3. **Your World History:** a vertical timeline on paper, one entry per year (Fraunces year, one headline, your key move). Scroll-revealed. Built from the 21st.dev / Aceternity timeline pattern, restyled.
4. **Share card** preview with buttons: Copy link, Download image, Share (Web Share API on mobile).
5. **Rematch** and **New match**.

```
┌ MY STATECRAFT ─────────────────────── paper ┐
│ 🇮🇳 INDIA · 2026–2037                         │
│ Power rank  #4 → #2  ▲2                      │
│ Leader Score 684 · Winner                     │
│ Energy security ▲24 · Jobs ▲ · Influence ▲18 │
│ "Built Asia's largest energy alliance."      │
│ statecraft · geopolitics.example/h/K7Q2M     │
└──────────────────────────────────────────────┘
```

### 5.10 First match: tutorial

- The first match for a new player is a **guided match**: India, 4 turns, Energy Shock, Easy bots.
- **Coach marks** point to one thing at a time (React Bits **Stepper** for the progress, a soft spotlight cut-out on the target). Each mark waits for the action, never for a timer.
- Turn 1: Brief and one card. Turn 2: Budget. Turn 3: a project and a proposal. Turn 4: the Why chain and the ranking.
- Skippable at any time. After it, "Play a full match" starts Quick Match.

### 5.11 Mobile (< 768 px)

```
┌────────────────────────────┐
│ 🇮🇳 $96B ●●●○  ◔0:54  #3▲1  │  compact top bar
│                            │
│        ( GLOBE 45% )       │
│                            │
├────────────────────────────┤
│ ① ② ③ ④ ⑤   (tabs)         │  bottom sheet (vaul, already in repo)
│ step content (scroll)      │  snap points: 45% / 90%
│                            │
│ [orders 3]   [ Lock turn ] │  sticky footer
└────────────────────────────┘
```

- The left rail becomes a "World" button that opens a sheet.
- Cards in Actions scroll horizontally with snap.
- Touch targets ≥ 44 px. Text ≥ 16 px.
- The reveal runs full-screen; the result sheet comes up from the bottom.

### 5.12 States

| State | Design |
|---|---|
| Loading a match | Globe visible at once; panels use skeletons (shadcn `Skeleton`) shaped like the real content |
| Waiting for a bot answer | Typing dots in the proposal card, max 2 s |
| Disconnected | Top bar shows "Reconnecting…" in `--mixed`; orders are kept locally and resent; after 20 s "A caretaker is playing for you. [Rejoin]" |
| Illegal order at resolve | Shown in the result sheet: "Your tariff on Japan was dropped: tariff already at 25%" |
| Empty step | Friendly line + one suggestion: "No proposals yet. Russia has spare oil. [Propose a deal]" |
| Error | Plain words + retry; never a stack trace |

## 6. Motion system

### 6.1 Tokens (`lib/motion.ts`)

| Token | Value | Use |
|---|---|---|
| `dur.micro` | 120 ms | Hover, press, toggle |
| `dur.small` | 200 ms | Chips, tooltips, tab change |
| `dur.medium` | 320 ms | Panels, sheets, card fly |
| `dur.large` | 600 ms | Result sheet, ranking reorder |
| `dur.cinematic` | 1.2–2.0 s | Camera moves |
| `ease.out` | `[0.22, 1, 0.36, 1]` | Entrances |
| `ease.inOut` | `[0.65, 0, 0.35, 1]` | Camera, large moves |
| `spring.snappy` | `{ stiffness: 500, damping: 32 }` | Buttons, chips, PC dots |
| `spring.gentle` | `{ stiffness: 170, damping: 24 }` | Panels, cards |
| `spring.layout` | `{ bounce: 0.15, visualDuration: 0.35 }` | `layout` reorders (ranking, orders tray) |
| `stagger.list` | 40 ms | Cards, advisor lines |
| `stagger.numbers` | 80 ms | Result deltas |

### 6.2 Patterns

- **Enter:** opacity 0 → 1 and y 8 px → 0 with `ease.out`. Never scale from 0.
- **Exit:** faster than enter (≈ 70% of the duration). `AnimatePresence` with stable keys; `mode="popLayout"` for lists.
- **Shared element:** a card that moves somewhere uses `layoutId` (card → orders tray, project → slot, seat chip → lobby list).
- **Numbers:** CountUp for single values; Counter (rolling digits) for prices and the treasury; NumberTicker for the final scores.
- **Scroll (Play page only):** `useScroll` + `useTransform` for the sticky story; `whileInView` with `once: true` for reveals.
- **Press feedback:** buttons scale to 0.97 on press with `spring.snappy`. This small "squish" makes the UI feel physical.

### 6.3 Juice budget

Feedback strength matches the moment's importance. More juice hides information.

| Level | When | Allowed |
|---|---|---|
| L0 | Reading, planning | Hover lift, focus ring, press squish |
| L1 | Confirming an order, slider change | Short fly, PC drain, soft click sound |
| L2 | Lock, proposal answered, project complete | Stamp, flip, chime, gold pulse on the globe |
| L3 | Rank climb, match win | Row glow, crown, confetti (win only), fanfare (short) |

Never: screen shake, flashing, particles in the planning phase, more than one L3 per turn.

### 6.4 Sound (F-5)

- Small set of CC0 interface sounds (for example Kenney's UI audio packs): click, card place, lock stamp, chime, knock, rank up, win. Each < 30 KB, preloaded after the first user gesture, played through Web Audio.
- On by default at low volume (30%). One-tap mute in the top bar; the choice is saved.
- Sound only repeats information already on screen. The game is fully playable muted.

### 6.5 Reduced motion

When `prefers-reduced-motion` is set (Motion respects it; GSAP checks it with `matchMedia`): camera moves become cuts with a fade, flips become fades, count-ups jump to the final value after 300 ms, confetti is off. The reveal still runs in order, at about 6 s.

## 7. The globe in the game

Reuse the 1.0 globe (`components/globe/*`, `PerfGuard`, `detect-gpu` tiers) and its layers.

| Layer | Source | Game use |
|---|---|---|
| Country outline / fill | `Borders`, `DataOverlay` | Your country gold outline; status fills (stable / tension / crisis) at 25% opacity |
| Flows | `TradeLayer`, `lanes.ts` | Treaty and market flows; line width = units; animated dash in the good's colour |
| Sanctions | `SanctionsLayer` | Red dashed arcs, drawn during the reveal |
| Relations | `RelationsLayer` | Optional view from the World Table |
| **Influence map** (new) | `DataOverlay` fills by region | Partner regions tinted in the leading seat's colour, opacity by sway; soft edges, no hard borders; visible in the reveal and World view |
| Markers | `Marker`, `MarkerProjector`, `ActivityMarkers` | Project pins, event pins, "thinking" dots |
| Chokepoints | `ChokepointMarkers` | Hormuz, Malacca, Suez light up during shipping events |
| Camera | `CameraRig`, `lib/camera/fly.ts` | Briefing fly-to, reveal choreography |

- During planning the globe is calm: slow idle rotation stops when the player interacts with the panel.
- **Label collisions (fix in 1.0 first):** today, conflict and summit cards overlap on mobile and the COP31 card hides under the Global Pulse panel on desktop. Before the game reuses the markers: give every label a priority, hide lower-priority labels that overlap a higher one or a panel's screen rectangle, and on mobile show pins only and open the card on tap.
- **Mobile dock hint (1.0):** the dock scrolls sideways but nothing shows it; add a right-edge fade and let the next item peek.
- Clicking a country on the globe opens its card (relations, trust, what it sells and needs, active treaties) with **Propose deal** as the main button.
- Performance tiers: on low GPUs the clouds and atmosphere layers turn off and flows draw as static lines.

## 8. Component sourcing

All third-party UI is copied into the repo (shadcn style), restyled to our tokens and reviewed. No new runtime dependency unless listed.

| Need | Source | Status |
|---|---|---|
| Buttons, dialog, sheet, tabs, tooltip, popover, command, drawer, skeleton | shadcn/ui (`components/ui/`) | In repo |
| SplitText, BlurText, ShinyText, CountUp, AnimatedList | React Bits (`components/bits/`) | In repo |
| ElasticSlider, Counter, SpotlightCard, TiltedCard, Magnet, ClickSpark, Stepper, ScrollReveal | React Bits (TS + Tailwind) | Add per component |
| NumberTicker, AnimatedBeam, BorderBeam, Marquee, Confetti | Magic UI (shadcn registry) | Add per component; Confetti adds `canvas-confetti` (small) |
| Timeline, leaderboard row, animated tabs | 21st.dev registry (pick, restyle) | Choose during S3 prototypes |
| Mobile sheet | `vaul` | In repo |
| Command search | `cmdk` | In repo |
| Replay choreography | `gsap` + `@gsap/react` | In repo |
| Component motion | `motion` (`motion/react`) | In repo |
| Icons | `lucide-react`; flags from `flag-icons` | In repo |

**Rules:** a component enters the repo only if it works with reduced motion, keyboard and screen readers, uses our tokens (no hard-coded colours), and costs < 10 KB gzipped (Confetti excepted, loaded only at match end).

## 9. Accessibility

- WCAG 2.1 AA contrast with the 1.0 tokens (`--ink-3` is 4.9:1 on white).
- Colour is never the only signal: ▲▼ glyphs, icons and labels with every colour.
- Full keyboard play (§5.5 shortcuts); visible focus rings; focus moves to the result sheet after the reveal.
- Screen readers: the timer announces at 30 s and 10 s (`aria-live="polite"`); the result sheet is a list with the deltas spoken ("Energy security up 9, to 71").
- The Why chain is an ordered list in the DOM; the beams are decoration (`aria-hidden`).
- Text ≥ 14 px desktop, 16 px mobile. Touch targets ≥ 44 px.
- An "Explain" toggle in settings adds plain-word help under every stat.

## 10. Performance budgets

| Metric | Target |
|---|---|
| Play page LCP | < 2.5 s on a mid-range phone (hero text first; globe loads after) |
| Match screen interactive | < 3 s after "Start" (engine and seed are small JSON + TS) |
| Interaction to next paint | < 200 ms for every slider, card and tab |
| Frame rate | 60 fps planning; ≥ 45 fps during the reveal on mid-range devices |
| JS for `/play/match` | < 250 KB gzipped beyond the existing globe bundle |
| Animations at once | ≤ 8 animated elements outside the globe |

Rules: animate only `transform` and `opacity`; no layout thrash in sliders (forecast runs in a Web Worker if it exceeds 8 ms); the globe pauses its idle rotation while the panel scrolls.

## 11. Prototype first

Before building the real screens (S2 in [BUILD-PLAN](BUILD-PLAN.md)), make three clickable HTML prototypes in `all_refrence-ui/prototype-statecraft-4/`:
1. The scrollable Play page.
2. One full turn (brief → budget → card → proposal → lock → reveal → result → Why).
3. Match end with the share card.

The owner reviews them for look and feel. Only then do the React screens get built.
