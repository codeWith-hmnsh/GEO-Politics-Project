# Statecraft 4.0 — Market and Reference Research

| Field | Value |
|---|---|
| Version | 4.0 (research note) |
| Date | 2026-10-11 |
| Related | [README](README.md) · [GAME-DESIGN](GAME-DESIGN.md) · [UI-DESIGN](UI-DESIGN.md) |

The owner asked: does a game like ours already exist, what are the gaps, and what can we borrow for ideas and UI? This note covers four sites the owner named, a wider web search, and a review of our own 1.0 app. The **proposed additions** in §5 and §6 are not yet in the game design. Each needs the owner's approval.

---

## 1. What exists

| Product | What it is | Strong | Weak |
|---|---|---|---|
| [Dummynation](https://dummynation.ahfgames.com/) | Real-time conquest strategy on a real world map; Steam, Epic, iOS, Android | "Grand strategy, streamlined"; borders shift as you occupy land; public and private (game-code) multiplayer; **Battle Royale** and **World War** (coalition) modes; scenario editor and sharing; 11 languages including Hindi; ~3,100 Steam reviews, Very Positive | Conquest is the only real goal; abstract economy; no real data; players report forced ads before single-player, crashes and UI scaling issues, and a hard start |
| [Country Simulator 2026](https://countrysimulator.org/) | Free browser game: create a fictional country, answer daily crisis dilemmas across 28 "ages" | No download, no login, works on phones; flag designer; daily dilemmas; claims multiplayer and leaderboards | Fictional, not real geopolitics; mechanics barely explained; early version (v0.5); heavy cross-promotion |
| [WorldOS — Modern Day 2026](https://worldos.cc/worlds/modern-day-2026) | Single-player, LLM-driven: you type orders in plain language; every other country is an AI government | Free text; story as flippable cards; chats with characters; three win paths (leading power, national project, leave office strong); slow-building threats with warnings | Pay-per-turn credits ("Zaps"); single-player; results come from a language model, so they are not consistent or explainable |
| [NationFall](https://www.playnationfall.com/) | Browser grand strategy, 207 nations, WW1 / WW2 / Cold War / WW3-2026 scenarios | "Paradox-level depth without the 1,000-hour learning curve"; NATO / BRICS blocs; UN resolutions and vetoes; AI remembers betrayals; 7-step escalation ladder | War-centred; multiplayer not described for the 2026 scenario; $19.99 full version |
| Geopolitical Simulator / Power & Revolution (Eversim) | Deep paid PC simulator, 175+ countries, 600+ data points per country | The deepest model on the market | Mixed to negative Steam reception (≈ 49–58% positive); described as buggy and hard to use |
| Global Protocol, Global Supremacy | New 2026 PC grand-strategy titles, 196–261 countries | Real-data 2026 setting | Early access, PC download, long sessions |
| [eDominations](https://edominations.com/en/index) | Old browser MMO with a player-run economy and politics | Persistent community | Dated UI, slow loop |
| [CFR Global Conflict Tracker](https://www.cfr.org/global-conflict-tracker) | Not a game: an editorial map of 27 conflicts | Clean taxonomy: type, **status** (Worsening, Improving, Unchanging), **impact**; grouped by region; one page per conflict | Static; no "why" between conflicts |
| [Liveuamap](https://liveuamap.com/) | Not a game: live map of geolocated news events | Every item has a place, an icon, a relative time and a photo; region and theme switching; a time archive back to 2014 | Dense navigation; one-line alerts without clear verification; ads and ad-block walls |

## 2. The gap

No product combines all five of these. Statecraft is built to do it:

1. **Real data, real countries, today's world** — Dummynation, Country Simulator and Country-ball games are abstract or fictional.
2. **Short multiplayer sessions with humans** (20–25 minutes) — the deep simulators are single-player and take hours; WorldOS is single-player.
3. **Consistent, explainable consequences** — WorldOS uses a language model, so the same move can give different results for no visible reason. Our deterministic engine plus the Why chain answers "why did this happen?" every time.
4. **Winning without war** — almost every competitor rewards conquest. Our Power Index and Leader Score reward growth, jobs, security, diplomacy and stability.
5. **Free and instant in the browser** — no download, no login, no pay-per-turn, no forced ads.

The game is **English only**. It has an Indian seat with a real problem to solve (jobs and oil), which suits our first audience.

**Positioning line:** *"Real geopolitics in 20 minutes. Lead a real country against real people. See exactly why the world changed."*

## 3. Lessons from complaints (loopholes to avoid)

| Competitor problem | Our rule |
|---|---|
| Forced ads before play (Dummynation) | No ads inside a match, ever. |
| Hard to learn (Dummynation, Eversim) | Guided first match; 5–7 cards, not 100 options; Why chain on every number. |
| Buggy, clunky deep sim (Eversim) | Fewer systems, fully tested; deterministic replays in CI. |
| Pay per turn (WorldOS) | Every turn is free. Monetization follows D-1 (style and comfort only). |
| Inconsistent AI outcomes (WorldOS) | The engine computes every number; AI may only translate text into a card (S7). |
| Thin, unexplained mechanics (Country Simulator) | The Play page shows exactly how a year works (sticky scroll story). |
| Unverified one-line alerts (Liveuamap) | Every simulated item is labelled **Simulated** and has a cause chain. |
| Name clash | "Statecraft" is already used by several small itch.io games and a board game. No big brand owns it, but search and store listings will be crowded. Keep it as the mode name under our brand: **GeoPolitics: Statecraft**. |

## 4. Our own app (1.0) — review

Screenshots of the running app (desktop 1600×900 and mobile 390×844) were checked on 2026-10-11.

**Keep (already top level):** the satellite globe with clouds and atmosphere, the white glass cards, the Global Pulse panel with toggles, the dark conflict cards with flags and "Active · 1,690 days", organisation badges (EU, BRICS, SCO), shipping lanes with ships, the bottom mode dock, the news card with sources. This is the base of the game's look. The game must feel like the same product.

**Fix before the game reuses it:**
1. **Label collisions.** On mobile, the conflict and summit cards overlap each other and cover the globe. On desktop, the COP31 card is clipped under the Global Pulse panel. Add collision avoidance: rank labels by priority, hide lower-priority labels when they overlap, and on mobile show only pins until the user taps one.
2. **Mobile dock:** it scrolls sideways (`overflow-x-auto`), but nothing shows that Energy and Diplomacy are hidden past the right edge. Add an edge fade or a peek of the next item so players know they can scroll.

(The `60 fps · tier 3` badge in the screenshots comes from `FpsMeter`, which is development-only, so it needs no fix.)

## 5. Proposed game additions (need approval)

| # | Idea | From | Where it fits | Step |
|---|---|---|---|---|
| R-1 | **Influence map:** countries where you hold treaties, aid or investment are tinted in your seat colour on the globe, and the tint spreads smoothly as influence grows. It gives the "my colour is spreading over the map" reward of Dummynation, without conquest. | Dummynation borders | Globe layer in the reveal and the World view | S3 |
| R-2 | **Coalition mode (3 v 3):** two blocs share a team score; deals inside a bloc are cheaper; a bloc wins together. | Dummynation World War | New room setting after Quick Match | S6–S8 |
| R-3 | **World Vote moments:** on turns 3, 6 and 9 the world votes on one resolution (sanctions, a climate deal, a trade rule). Every seat votes in 20 s; the result changes the world and relations. A shared multiplayer moment. | NationFall UN votes | Briefing of those turns | S5 |
| R-4 | **Early warnings:** before unrest or a debt crisis, the briefing shows a warning one turn earlier ("Protests growing in 3 cities"). Problems build up; they never appear from nowhere. | WorldOS slow threats | Advisors and briefing | S3 |
| R-5 | **Status trends:** every country card and the World Table show a trend chip — Worsening, Improving or Unchanging — for stability, economy and security. | CFR tracker | Country card, World Table | S3 |
| R-6 | **Located World Feed:** each news item has an icon, a place and the year; tapping it flies the camera to that place. | Liveuamap | News card and the reveal | S3 |
| R-7 | **History scrubber:** on the end screen, a year slider replays the globe year by year (flows, influence tint, ranking). | Liveuamap time archive | Match end | S4 |
| R-8 | **Leader identity:** the player picks a leader name and one of a few portrait styles shown on the share card. Real countries stay real; only the leader is yours. | Country Simulator flag designer | Lobby | S4 |
| R-9 | **Custom scenarios** made by players and shared with a code. | Dummynation editor | Later | S8 |

## 6. UI ideas from the references

These add to [UI-DESIGN.md](UI-DESIGN.md) once approved:

- **Map as the hero, panels as glass** (our 1.0 already does this better than every competitor). Keep the globe at least 55% of the desktop screen in a match.
- **Pins first, cards on demand** on small screens (Liveuamap keeps the map readable this way).
- **Icon language for events:** one Lucide icon per event type (energy, food, trade, diplomacy, unrest, disaster) used on the globe pins, the feed and the Why chain, so the player learns one visual vocabulary.
- **Editorial taxonomy chips** (CFR): small pill chips with a dot for status — consistent everywhere.
- **Flippable story cards** (WorldOS) for the six-move reveal and the World News.
- **Spreading colour** (Dummynation) for the influence map, animated with a soft shader blend, not hard borders.

## Sources

- [Dummynation](https://dummynation.ahfgames.com/) · [Dummynation Steam stats (Steambase)](https://steambase.io/games/dummynation) · [Dummynation reviews decoded (Marlvel)](https://marlvel.ai/apps/dummynation/reviews)
- [Country Simulator 2026](https://countrysimulator.org/) · [Browser country games list](https://countrysimulator.org/browser-based-country-games/)
- [WorldOS — Modern Day 2026](https://worldos.cc/worlds/modern-day-2026)
- [NationFall](https://www.playnationfall.com/)
- [Geopolitical Simulator 2026 (Epic)](https://store.epicgames.com/p/geopolitical-simulator-2026-63dbf3) · [Power & Revolution 2023 player stats (SteamPulse)](https://www.steampulse.org/game/2392520)
- [eDominations](https://edominations.com/en/index)
- [Daily Simulator — Geopolitical 2026](https://dailysimulator.com/simulators/geopolitical-2026-simulator/)
- [CFR Global Conflict Tracker](https://www.cfr.org/global-conflict-tracker)
- [Liveuamap](https://liveuamap.com/)
- "Statecraft" name uses: [itch.io board game](https://scardoso.itch.io/statecraft) · [itch.io demo](https://weissdev.itch.io/statecraft-demo) · [RAWG listing](https://rawg.io/games/statecraft)
