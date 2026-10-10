# Geo-Politics 2.0 — Statecraft — Product Requirements Document

| Field | Value |
|---|---|
| Version | 1.0 (plan for review) |
| Date | 2026-10-10 |
| Status | **Draft — decisions D-1 to D-8 open** |
| Builds on | Geo-Politics 1.0 ([`../docs/PRD.md`](../docs/PRD.md)) — M0–M4 shipped on `main` |
| Companion docs | [GAME-DESIGN.md](GAME-DESIGN.md) · [UI-DESIGN.md](UI-DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [MONETIZATION.md](MONETIZATION.md) · [BUILD-PLAN.md](BUILD-PLAN.md) |

---

## 1. Pitch

**Statecraft** is the multiplayer mode of Geo-Politics. Up to 10 people each lead one real country, starting from today's real data and today's real tensions. They spend a budget, sign deals, impose tariffs, ask allies for help, and sometimes go to war. Every decision changes numbers that other players feel, so they react, and the world evolves through chain reactions. No story is scripted: **players write the history.** At the end, the match becomes a simulated newspaper and each leader gets a score and a rank.

```
EXPLORE (1.0)                         PLAY (2.0)
Real globe, real news  ──"What if I     Choose a country → shared world
Learn why it matters      was in        Decide → consequence → others react
                          charge?"──►   Match ends → World Chronicle → ranking
        ▲                                         │
        └──────── "See the real story" ◄──────────┘
```

The two halves feed each other: Explore gives players the knowledge to play well; every game screen links back to real context ("Real world: India imports ~85 % of its crude oil").

## 2. Is it feasible? Is it free?

**Yes, it can be built, and the MVP can run at $0/month.** Honest notes:

| Question | Answer |
|---|---|
| Can a small team build it? | Yes, if the scope is held: a turn-based, server-resolved game (not real-time action). The hard part is the **rules engine** and **balance**, not the graphics — the globe already exists. |
| Biggest risk? | Not tech — **empty lobbies**. A 10-player game with 3 online users is dead. Mitigation is built in: bots fill seats, Daily Crisis is solo, Async matches let friends play across a week. |
| Second risk? | **Is it fun?** We prove it solo first (G1: you vs 9 bots, no network) before building multiplayer. |
| Free at MVP? | Yes: Supabase free (Postgres, Auth, Realtime: ~200 concurrent connections, ~2 M messages/month), Vercel Hobby, template-written news. Roughly 20 full 10-player matches at the same time and ~2,000 matches a month fit in free limits. |
| When does it cost money? | (1) The day we take payments — Vercel Hobby forbids commercial use, so Vercel Pro (~$20/month) is needed. (2) When traffic outgrows Supabase free (~$25/month Pro). (3) If an LLM writes the news (optional, D-5). See [ARCHITECTURE.md §11](ARCHITECTURE.md#11-cost). |
| Legal? | Fine as a **social game**: in-game money must never be cashable, tradable for money or tied to cash prizes (India's Online Gaming Act 2025). See [MONETIZATION.md §5](MONETIZATION.md#5-legal-and-platform-limits). |

## 3. Problem and opportunity

- 1.0 explains the world; it cannot let people **feel** why sanctions hurt both sides, why a small oil exporter has leverage, or why alliances are costly. Playing a role teaches that faster than reading.
- Strategy games about geopolitics are either fictional (Civilization), military-only (Conflict of Nations), or solo spreadsheets (Democracy 4). None starts from **today's real data and news** on a **real 3D globe** with **friends as the other leaders**.
- The output — an alternate history newspaper — is naturally shareable, which is how the game spreads.

## 4. Target players

| Persona | Need | How Statecraft serves them |
|---|---|---|
| **Aarav, 21, UPSC aspirant** (1.0 primary) | Make current affairs stick | Plays India in Daily Crisis; tooltips link to real data and glossary |
| **Kabir, 19, college gamer** | A smart game to play with friends | Private room with 6 friends, voice on Discord, 30-minute match, shares the Chronicle |
| **Sana, 27, strategy fan** | Depth and competition | Ranked, seasons, country leaderboards, Async long matches |
| **Teacher** | Classroom activity | 10-seat room, students as countries, Chronicle as debrief (P2 classroom pack) |

MVP primary: **Kabir** (social group play drives growth). Must still pass the 1.0 "Meera test": a 16-year-old understands every screen.

## 5. Goals and non-goals

### Goals
1. **G1 — Fun first:** ≥ 60 % of playtest groups ask for a rematch.
2. **G2 — Understand in 60 s:** a new player makes a meaningful first decision within 60 s of match start (briefing + advisor hints).
3. **G3 — Cause is visible:** every number change can be traced back to its cause in one tap ("Why did this change?").
4. **G4 — Fair across countries:** win rate per country within ±10 % of the average after balancing (bot simulations + live data).
5. **G5 — Never empty:** a Quick Match starts within 60 s at any traffic level (bots fill seats).
6. **G6 — $0 at MVP traffic.**

### Non-goals (MVP)
- No real-time action or unit micro-management; no map conquest of provinces.
- No playable nuclear strike (see [GAME-DESIGN.md §8.6](GAME-DESIGN.md#86-nuclear-weapons)).
- No free-text chat between strangers (structured offers + quick phrases only; D-3).
- No real politicians' names, faces or parties.
- No native mobile app (responsive web).
- No payments until the metrics gate in [BUILD-PLAN.md](BUILD-PLAN.md) G8.

## 6. Product principles

1. **Systems, not scripts.** We build rules (supply, money, trust, force); players create events.
2. **Every action costs something.** Helping an ally drains your stock; a tariff raises your own prices; war drains treasury and approval. No free buttons.
3. **Consequences are visible and traceable.** On the globe (arcs, fills, flows), in numbers (deltas), and in a cause chain.
4. **Serious, not gory.** War is shown through data, maps and simulated reports — never images of injury.
5. **Simulated is always labelled.** Game news never mixes with the real news rail of 1.0.
6. **Fair start, fair score.** Players are scored on how much they improved their own country, not on starting size.
7. **Same calm look.** The 1.0 design language, with three game signals only: the clock, the wire, the red.

## 7. Information architecture

```
GEO-POLITICS
├── Explore (1.0, unchanged)  Home · Modes · Learn
└── Play — "Statecraft"  (new header item; /play)
      ├── Play hub          Quick Match · Daily Crisis · Create room · Join with code · Continue (async)
      ├── Room / Lobby      Country picker on the globe · seats · settings · ready
      ├── Match             Briefing → rounds (Orders → Resolve → Replay) → Term end
      ├── Results           Scores · ranks · titles · The World Chronicle (shareable)
      ├── Leaderboards      Global rating · season · per country · Daily Crisis · friends
      ├── Leader profile    Rating, titles, history, best countries
      └── How to play       60-second interactive tutorial
```

## 8. Core experience (one match)

```
LOBBY (≤ 60 s)   pick country on globe → bots fill → ready
   │
BRIEFING (20 s)  camera flies to your country · "You lead India" · 3 real challenges · 1 national goal
   │
ROUND × 12       ┌ ORDERS (60–90 s, everyone at once)
(1 round =       │   budget sliders · up to 3 decisions · answer requests · send offers
 1 quarter)      ├ RESOLVE (server, < 1 s) — deterministic engine
                 ├ REPLAY (≤ 20 s) — globe animates each event · World Wire headlines · deltas
                 └ REACT — incoming requests and alerts carry into the next ORDERS
   │
ELECTION at round 6 and 12 — low approval costs score; very low ends your term early (bot takes over)
   │
TERM END         scores · ranks · titles · The World Chronicle · rating change · rematch
```

Speeds: **Blitz** 8 rounds × 60 s (~12 min) · **Standard** 12 × 90 s (~25–30 min, default) · **Async** 12 rounds × 12 h or when all have submitted (~3–6 days).

## 9. Functional requirements

Priority: **P0** MVP must · **P1** MVP should · **P2** later.

### 9.1 Accounts and identity
| ID | P | Requirement |
|---|---|---|
| FR-A-01 | P0 | Play as guest (anonymous session, random leader name). Guests can play Quick Match, private rooms and Daily Crisis. |
| FR-A-02 | P0 | Sign in with Google or email magic link to keep rating, history and titles; a guest upgrades without losing progress. |
| FR-A-03 | P0 | Ranked matches and leaderboards require a signed-in account. |
| FR-A-04 | P0 | Display names pass a profanity and impersonation filter (no real head-of-state names). |

### 9.2 Hub and matchmaking
| ID | P | Requirement |
|---|---|---|
| FR-H-01 | P0 | Quick Match: join an open Standard room or create one; start when ≥ 2 humans are ready or after 60 s; bots fill the remaining seats. |
| FR-H-02 | P0 | Private room: 6-character code + invite link; host sets speed, rounds, bot difficulty, ranked on/off. |
| FR-H-03 | P0 | Country picker on the globe; each card shows real starting stats, strengths, weaknesses and a difficulty tag. Taken seats show the player. |
| FR-H-04 | P1 | Ranked queue (Standard, rating-matched within ±200 when possible). |
| FR-H-05 | P1 | Async rooms with "Your turn" notifications (email + web push). |
| FR-H-06 | P1 | Daily Crisis: solo vs 9 bots, same seed and country for everyone that day, Blitz speed, daily leaderboard, streak. |

### 9.3 Match
| ID | P | Requirement |
|---|---|---|
| FR-G-01 | P0 | Each country starts from real data (GDP, growth, inflation, unemployment, debt, spending shares, energy and trade dependence, Capability Index, nuclear status, relations). Values are rounded and labelled "Starting estimate, 2026 data". |
| FR-G-02 | P0 | Simultaneous rounds: Orders → Resolve → Replay. Server is the only authority; orders are secret until resolved. |
| FR-G-03 | P0 | Budget: tax level and six ministry sliders (Health, Education, Infrastructure, Defense, Welfare, Research & Energy) with a live forecast before submitting. |
| FR-G-04 | P0 | Up to 3 decisions per round from the action catalogue ([GAME-DESIGN.md §5](GAME-DESIGN.md#5-action-space)); a 4th when approval ≥ 70. |
| FR-G-05 | P0 | Diplomatic offers with give/get terms; recipients Accept / Counter / Decline; offers expire after the next round. Answering is free (no decision slot). |
| FR-G-06 | P0 | Trade and supply chains for Energy, Food, Tech and Minerals with a world market and prices. |
| FR-G-07 | P0 | Conflict: mobilise, strike (choose target type and city), blockade, cyber, ground offensive (neighbours), ceasefire and peace; alliance call-to-arms. |
| FR-G-08 | P0 | Replay animates every event on the globe with stat deltas; "Why did this change?" shows the cause chain for any number. |
| FR-G-09 | P0 | World Wire: simulated headlines generated from events, labelled **Simulated**. |
| FR-G-10 | P0 | Global Tension meter; at 100 the match ends in catastrophe and every score is cut. |
| FR-G-11 | P0 | Elections at rounds 6 and 12; approval below 25 at an election removes the leader (bot takes over, score frozen with a penalty). |
| FR-G-12 | P0 | Disconnect: after 2 missed rounds a bot plays the seat ("Caretaker"); the player can return. |
| FR-G-13 | P0 | Advisor hints: 1–3 rule-based tips per round ("Debt will pass 100 % in 2 rounds"). |
| FR-G-14 | P1 | World events every 2 rounds (oil shock, monsoon failure, chip shortage, pandemic wave, earthquake), seeded from current news themes. |
| FR-G-15 | P1 | Secret agenda: one hidden objective per player, revealed at the end (bonus points). |
| FR-G-16 | P1 | Quick phrases and emoji reactions to other leaders (no free text, D-3). |
| FR-G-17 | P2 | UN Security Council resolutions voted by all players. |
| FR-G-18 | P2 | Intel operations beyond intel sharing (spy, sabotage). |

### 9.4 Results, Chronicle and ranking
| ID | P | Requirement |
|---|---|---|
| FR-R-01 | P0 | Results: rank, Leader Score (0–1000) with 5-dimension breakdown, start-vs-end stats, titles earned. |
| FR-R-02 | P0 | **The World Chronicle**: a simulated front page (lead story, 3 stories, timeline, final standings, one verdict line per leader), public URL, share image. Clearly marked "Simulated — a game played on Geo-Politics". |
| FR-R-03 | P0 | All match data is saved: seats, orders, offers, responses, events, per-round state, scores, engine version (replayable). |
| FR-R-04 | P1 | Leader Rating (multiplayer Elo/Glicko-style) for ranked matches; season leaderboards; per-country leaderboards ("Best leaders of China"). |
| FR-R-05 | P1 | Leader profile: rating, rank, titles, matches, best country, country dossier from the last match (GDP, defense, approval, debt, alliances). |
| FR-R-06 | P1 | Rematch with the same group in one tap. |
| FR-R-07 | P2 | Full replay viewer (scrub rounds on the globe). |

## 10. Content and safety rules

| Area | Rule |
|---|---|
| Real people | Players are "Head of Government of India", never a named politician. No real portraits, party names or logos. |
| Violence | Strikes and casualties appear as map effects, numbers and short neutral reports, always "Simulated estimate". No images of injury, no celebration copy ("Destroyed!"), no kill counters on profiles. |
| Targeting civilians | Allowed as a choice (it is part of the real dilemma) but carries the heaviest reputation, Tension and approval costs, and the UI explains international humanitarian law in one line. |
| Nuclear | Not a playable strike. Nuclear states get deterrence and an "alert" posture that raises Tension. |
| Sensitive borders | Same de facto boundaries and disputed hatching as 1.0. No "conquest" changes borders on the map; a front meter shows pressure instead. |
| Simulated content | Every game headline, Chronicle and share image carries a **Simulated** marker; game content never appears in the 1.0 news rail, Daily Brief or search. |
| Communication | MVP: structured offers, quick phrases, emoji reactions. No stranger free text. Report and mute on every player. |
| Age | 13+. Ranked requires an account. |
| Disclaimer | "Statecraft is a simulation of choices, not a prediction or an endorsement." |

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Order submit acknowledged < 300 ms; round resolve + broadcast < 2 s after the deadline. |
| Fairness | Server-authoritative; deterministic engine with seeded randomness; each match stores its engine version and seed. Same inputs → same outputs (tested). |
| Reliability | A dropped client rejoins into the current round with full state; a crashed resolve is retried idempotently. |
| Performance | Same budgets as 1.0 (60 fps desktop, ≥ 30 fps mid Android). Game HUD is DOM over the canvas; lite globe tier on weak devices. |
| Accessibility | WCAG 2.1 AA; adjustable timers (Relaxed speed, Async); every globe action reachable from lists; colour never the only signal; reduced motion turns replay into a card list. |
| Privacy | Guests store no personal data; accounts store email + display name only. Cookieless analytics. |
| Cost | $0/month at MVP traffic (≤ 2,000 matches/month). |

## 12. Success metrics

| Metric | Target (60 days after public MVP) |
|---|---|
| Match completion (humans still present at term end) | ≥ 70 % |
| Rematch rate (group plays again within 1 h) | ≥ 40 % |
| Day-1 / Day-7 return | ≥ 30 % / ≥ 12 % |
| Matches per active player per week | ≥ 3 |
| Quick Match start time (p90) | ≤ 60 s |
| Chronicle share rate | ≥ 10 % of finished matches |
| Players who tap "Why did this change?" at least once per match | ≥ 50 % |
| Explore → Play conversion (1.0 visitors who start a match) | ≥ 8 % |
| Country win-rate spread | within ±10 % of mean |

## 13. Release scope

| Release | Scope |
|---|---|
| **G1 Solo sandbox** (internal) | Engine v1, you vs 9 bots, local only, budget + projects + trade + basic conflict, replay, cause chain |
| **G2–G4 Multiplayer MVP** (closed beta) | Rooms, lobby, guest + Google login, Standard and Blitz, full action space, diplomacy offers, alliances, war, Tension, elections |
| **G5 Chronicle + ranking** (open beta) | World Wire, Chronicle + share image, Leader Score, ratings, leaderboards, profiles |
| **G6 Retention** | Daily Crisis, Async matches, seasons, titles, notifications, world events, secret agendas |
| **G7 Launch** | Mobile polish, accessibility pass, playtest-driven balance, How to play |
| **G8 Monetization** | Only after the metrics gate — see [MONETIZATION.md](MONETIZATION.md) |

## 14. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| **D-1** | Monetization model: may players buy in-game money? | **No in ranked.** Sell depth, comfort, style, scenarios. Optional "Emergency Fund" only in unranked rooms, as a loan with interest. Details: [MONETIZATION.md](MONETIZATION.md). |
| **D-2** | Default match length | Standard: 12 rounds × 90 s (~25–30 min). |
| **D-3** | Free-text chat | Not in MVP. Structured offers + quick phrases + emoji. Friends-only free text in P2 with filter and report. |
| **D-4** | The 10 MVP countries | USA, China, India, Russia, Pakistan, Saudi Arabia, Germany, Japan, Brazil, UK (covers oil, food, tech, minerals, 6 nuclear states, the user's examples). |
| **D-5** | Who writes the news | MVP: templates ($0). Later, an LLM rewrites each round's wire and the Chronicle. Default model `claude-opus-5-5` (~$0.30 per match); `claude-haiku-5-5` is ~$0.01 per match if cost matters more than prose quality. |
| **D-6** | Mode name | "Statecraft" (alternatives: "World Leaders", "Situation Room"). |
| **D-7** | Supabase now | Needed from G2. G0–G1 run without it. The owner creates the project and keys. |
| **D-8** | Nuclear | No playable strike; deterrence + alert posture only. |
| **D-9** | Entry flow | **Decided by the owner (2026-10-10):** no mode choice. One Start button takes every player into the shared world that is running now; they pick any free country (bots hold free countries and hand them over from the current round). When all 10 countries have players, the next Start opens a new world. Daily Crisis, private rooms and Async (FR-H-02, FR-H-05, FR-H-06) leave the MVP and become later options. |

## 15. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Empty lobbies | Game feels dead | Bots fill seats; Daily Crisis solo; Async; invite links; Quick Match never waits > 60 s |
| Not fun / too complex | Churn after first match | Solo sandbox playtests before multiplayer; 3 decisions per round cap; advisor hints; tutorial; Blitz mode |
| Balance (USA always wins) | Unfair ranking | Score = improvement from own start; bot self-play balance runs (10k matches) per engine change; per-country win-rate dashboard |
| Kingmaking / griefing (one player attacks the leader for fun) | Frustration | Aggression is costly (Tension, reputation, approval, treasury); alliance call-to-arms; ranked rating loss for leaving |
| Real-world sensitivity (India–Pakistan, China–Taiwan…) | Backlash | Neutral copy, no border changes, Simulated labels, disclaimer, no real leaders; Taiwan not a playable seat |
| Toxic communication | Safety | No stranger free text; report/mute; name filter |
| Pay-to-win temptation | Kills ranking value | MONETIZATION.md rules; ranked is never purchasable |
| Supabase free limits | Outage at a spike | Realtime used only for small broadcasts; state fetched via HTTP; upgrade path documented |
| Scope creep | Never ships | Hard caps: 10 countries, 4 goods, 3 decisions/round, 12 rounds; P2 list is frozen until G7 |
