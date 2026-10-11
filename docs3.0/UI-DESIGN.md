# Statecraft 3.0 — UI Design

This doc changes only the parts of the in-game screen that deal with orders and diplomacy. The layout, theme, globe, top bar, online leaders and leader strip follow [2.0 UI-DESIGN](../docs2.0/UI-DESIGN.md) and the prototype [`../all_refrence-ui/prototype-statecraft/match.html`](../all_refrence-ui/prototype-statecraft/match.html).

## 1. Screen layout

```
┌──────────────────────────────────────────────────────────────┐
│ World #128 · Round 3/8 · Q3      ◔ 0:54   Tension 42   ●●●○ 🔔│
│ WIRE  Oil +6% · Russia cuts exports to China · …             │
│                                                              │
│                         ( GLOBE )              ┌───────────┐ │
│                                                │ Country    │ │
│                                                │ card       │ │
│                                                └───────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ✎ What do you want to do this round?                  ⏎  │ │ ← order bar
│ │ [Cut imports] [Buy] [Tariff] [Build] [Propose] [Aid] …   │ │ ← chips
│ └──────────────────────────────────────────────────────────┘ │
│ ┌ HY India ─ Treasury $412B ─ In/Out ─ Approval ─ [1][2][3] ─ End turn ┐
└──────────────────────────────────────────────────────────────┘
```

- The 2.0 dock (Budget, Build, Economy, Trade, Diplomacy, Military drawers) becomes the chip row. Budget sliders stay, opened from the `Budget` chip.
- The three order slots in the leader strip fill with small card thumbnails.

## 2. Order bar

- Placeholder rotates through real examples from the current world: *"Try: buy grain from the USA"*, *"Try: tariff on Chinese tech"*.
- Typing shows chip suggestions under the bar (verbs and countries that match), like a command palette.
- Enter or ⏎ sends the text to the interpreter. A thin progress line runs along the bar while it reads.
- Voice input on mobile (system dictation) is enough; no custom speech feature.

## 3. Order card

```
┌ REDUCE IMPORT ─────────────────────────────── public ▾ ┐
│ India  ←  [Russia ▾]   [Oil ▾]   [40% ▾]   [3 rounds ▾] │
│ "stop depending on one supplier"                        │
│ ─────────────────────────────────────────────────────── │
│ Forecast  Treasury −$1.2B · Oil +4% · Russia trust −8   │
│ Forecast assumes no one else reacts.                    │
│                              [Edit]  [Cancel] [Confirm] │
└─────────────────────────────────────────────────────────┘
```

- Card rises from the bar (Motion spring, 220 ms). The globe draws a dashed preview arc for the flow.
- Fields filled from the player's words use `--ink`; defaults use `--ink-3` with a small "default" tag.
- An `ask` field pulses once in `--mixed` and opens its chips.
- Feasibility issues show the REQUESTED / FEASIBLE pair in `--crisis`.
- Confirm sends the card into the next free slot with a short fly animation.

## 4. Inbox and negotiation thread

- The bell in the top bar opens the inbox popover. Items: notices about orders that affect you, proposals, treaty breaks.
- A proposal opens as a thread on the right side, replacing the country card:

```
┌ Russia ⇄ India ─────────────────────── 3 rounds ┐
│ RUSSIA OFFERS                                   │
│  gives  Oil at market −5%                       │
│  wants  No new India–USA defence deal           │
│  if broken  supply stops, trust −20             │
│                                                 │
│ ✎ Reply in your words…                          │
│ [Reject]            [Counter]          [Accept] │
└─────────────────────────────────────────────────┘
```

- A counter shows changed terms with a `--gold` underline.
- Accepted treaties appear on the globe as a thin `--ally` link between capitals, and in the leader strip as a small seal.
- Reliability shows as a small percentage under each leader in the online popover.

## 5. Unsupported and refused

- `unsupported`: a calm `--paper-2` card: *"The world can't do this yet. Closest: Statement · Tariff · Propose."* plus "Added to the wish list" in small text.
- `refused`: same card style with a one-line reason. No red alarm styling; this is guidance, not punishment.

## 6. Reveal

Follows 2.0 replay choreography, with two additions:

- Each player's confirmed cards flip face up in turn before their effects play.
- The forecast vs actual line appears on the player's own stat changes.

## 7. Mobile (≤ 640 px)

- Order bar sits above the leader strip; chips scroll horizontally.
- Order card and thread open as bottom sheets (85% height).
- The globe stays visible above the sheet.

## 8. Accessibility

- The order bar is a labelled text field; chips are buttons with full names.
- Card fields are native selects or listboxes reachable by keyboard.
- Forecast and result changes are announced through a polite live region.
- Every colour signal also has text (trust −8, "default", "feasible 18%").
