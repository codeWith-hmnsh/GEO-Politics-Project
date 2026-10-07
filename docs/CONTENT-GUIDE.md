# Geo-Politics 1.0 — Content & Editorial Guide

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-10-07 |
| Related | [PRD.md](PRD.md) · [DATA-SOURCES.md](DATA-SOURCES.md) |

This product teaches. Teaching needs written content: explainers, labels, story tours, glossary and curated data. This guide keeps that content **neutral, sourced, short and consistent**.

---

## 1. Neutrality rules

1. **Describe, do not judge.** "Russia launched a full-scale invasion of Ukraine in February 2022" — a documented fact, fine. "Russia's brutal aggression" — judgement, not allowed.
2. **Attribute claims.** Contested numbers or events always say who claims them: "Gaza Health Ministry says…", "Ukraine's military says…", "UN estimates…".
3. **Name both sides of a dispute.** Disputed territory text: "Kashmir — administered in parts by India, Pakistan and China; claimed by India and Pakistan."
4. **Use internationally common names**, with the other name in brackets where relevant on first use.
5. **No ranking language.** Capability Index is never "strongest" / "weakest". Comparisons show bars, not winners.
6. **Same template for every country.** No country gets extra adjectives or extra sections.
7. **Date everything.** Every claim that can change carries "as of <month year>".

Banned words in UI and explainers: aggressive, rogue, regime (except in formal names), puppet, terrorist state, evil, heroic, crushing, humiliating. Use "government", "forces", "group".

## 2. Explainer templates

### 2.1 "Why it matters" (conflict, summit, crisis, chokepoint)

Exactly 3 bullets, each ≤ 18 words, each a different angle:

| Bullet | Angle | Example (Strait of Hormuz) |
|---|---|---|
| 1 | **Scale / human** | About a fifth of the world's oil passes through this 33 km-wide strait. |
| 2 | **Global effect** | Any closure would spike fuel prices worldwide, including in India. |
| 3 | **Power / politics** | Iran borders it; the US and allies patrol it — a frequent flashpoint. |

Bullet 2 should, where honest, connect to the reader's life (prices, jobs, travel, India where relevant).

### 2.2 "What this number means"

One sentence, ≤ 20 words, with a reference point:

- Inflation 4.2 % → "Prices rise about 4 % a year. India's central bank targets 4 %."
- Military spending 2.4 % of GDP → "Close to NATO's 2 % guideline used as a common benchmark."
- Debt-to-GDP 83 % → "Government owes about 83 % of one year's total economic output."

### 2.3 Conflict card fields

| Field | Rule |
|---|---|
| Name | Common neutral name: "Russia–Ukraine war", "Sudan civil war" |
| Parties | States and main armed groups, flags for states |
| Status | One of: Active · Escalating · Ceasefire · Frozen |
| Casualties | Range + source + date, or "Estimates vary" with 2 sources |
| Why it matters | Template 2.1 |

### 2.4 Country relation basis line

`<status word> — <reason 1>; <reason 2>` ≤ 12 words. Example: "Ally — defence supplier; strategic partnership since 2000."

## 3. Glossary (MVP, 40 terms)

Each entry: term, 2-line definition (≤ 35 words), "see on globe" action (highlight members / places), related terms.

| Group | Terms |
|---|---|
| Organisations | NATO, EU, UN, UN Security Council, BRICS, G7, G20, QUAD, ASEAN, SCO, African Union, OPEC+, CSTO, IMF, World Bank |
| Security | Nuclear triad, NPT, Deterrence, Ceasefire, Line of Control, Proxy war, Arms embargo, Military alliance, Annexation |
| Economy | GDP, GDP growth, Inflation, Unemployment, Trade balance, Tariff, Debt-to-GDP, IMF bailout, Recession, Sanctions |
| Energy | Chokepoint, LNG, Energy import dependence, Critical minerals, Rare earths, Renewable share |

## 4. Defense Capability Index — method

Shown in the "How we calculate" modal, word for word.

> **What it is:** A rough 0–10 estimate of the *size* of a country's air, land and sea forces, built only from published numbers.
> **What it is not:** A prediction of who would win a war. It ignores training, technology quality, morale, alliances, geography and nuclear weapons.

```
n(x)  = log(1 + x) / log(1 + world_max(x))          // 0..1, log scale so giants don't flatten everyone

Air   = 10 × ( 0.55·n(combat aircraft)
             + 0.20·n(attack helicopters)
             + 0.25·n(tankers + AEW&C + military transport) )

Land  = 10 × ( 0.35·n(active ground personnel)
             + 0.35·n(main battle tanks + infantry fighting vehicles)
             + 0.30·n(artillery incl. rocket artillery) )

Sea   = 10 × ( 0.35·n(major surface combatants: destroyers + frigates + cruisers)
             + 0.35·n(submarines, nuclear-powered counted ×2)
             + 0.30·n(aircraft carriers ×3 + amphibious assault ships) )

Round to 1 decimal. Landlocked countries show Sea = "—", not 0.
```

Inputs live in `data/curated/capability.json` with one source URL and year per number. The modal lists the inputs for the selected country.

## 5. Story Tours

### 5.1 Script format (`data/tours/<id>.json`)

```json
{
  "id": "hormuz",
  "title": "Why the Strait of Hormuz matters",
  "duration_s": 75,
  "reviewed": "2026-10-01",
  "sources": ["https://www.eia.gov/...", "..."],
  "stops": [
    {
      "camera": { "lat": 26.5, "lng": 56.3, "altitude": 1.25, "tilt": 40, "heading": 0 },
      "orbit_deg": 30,
      "highlight": ["IRN", "OMN", "ARE"],
      "caption_title": "A 33 km gap",
      "caption": "Between Iran and Oman lies the narrowest point of the world's most important oil route.",
      "close_up": { "lat": 26.57, "lng": 56.25, "range_m": 40000 }
    }
  ],
  "live_query": { "section": "energy", "terms": ["Hormuz"] }
}
```

Rules: 4–7 stops · caption ≤ 25 words · each stop 8–15 s · final stop is always "What's happening now" (live news) · reviewed date shown in the player.

### 5.2 MVP tours (6)

| # | Tour | Core idea |
|---|---|---|
| 1 | Russia–Ukraine war | From 2014 Crimea to today's front line; why Europe and grain/gas prices care |
| 2 | Israel, Gaza and the wider Middle East | Key actors, borders, and how regional states are involved |
| 3 | India's borders: Pakistan and China | Kashmir, LoC, LAC; why India's two borders shape its foreign policy |
| 4 | Strait of Hormuz and the oil route | Chokepoint geography; who depends on it |
| 5 | Blocs explained: NATO, BRICS, QUAD, SCO | Who is in which club and why some countries are in "rival" clubs |
| 6 | South China Sea and Taiwan Strait | Claims, shipping lanes, chips |

Each tour must be re-reviewed when its conflict status changes, and at least every 60 days.

## 6. Curated data maintenance

| File | Owner | Review cadence | Trigger for urgent update |
|---|---|---|---|
| `conflicts.json` | Editor | Weekly | New war, ceasefire, major escalation (2-source rule) |
| `relations_baseline.json` | Editor | Weekly review queue | Break of diplomatic relations, new alliance |
| `summits.json` | Editor | Monthly | Summit announced / moved |
| `hostile_borders.json` | Editor | Monthly | Border clashes |
| `crises.json`, `imf_programs.json` | Editor | Monthly | IMF programme approved / default |
| `nuclear.json` | Editor | Yearly (after SIPRI Yearbook, June) | Nuclear test |
| `capability.json` | Editor | Yearly | — |
| `chokepoints.json`, `sanctions.json` | Editor | Monthly | New sanctions regime |

Every change: a commit with source URLs in the message, and an entry in `change_log` (feeds "changed this week" badges). The public `/sources` page shows "Curated data last reviewed: <date>".

## 7. Microcopy bank (starter)

| Place | Copy |
|---|---|
| Intro headline | What is happening in the world right now. |
| Intro subline | Wars, alliances, money and power — live, on one globe. |
| Relations hint | Tap a country to see its friends and rivals. |
| Live indicator | Live · updated 12 min ago |
| Stale | Some data is from cache (6 h old). |
| Empty country news | No major news in the last 48 hours from trusted sources. |
| Symbolic arc tooltip | Symbolic — based on reports from 2+ trusted outlets in the last 48 h. |
| Capability badge | Estimate — not a ranking of who would win. |
| Coming soon mode | Energy mode is coming soon. |
