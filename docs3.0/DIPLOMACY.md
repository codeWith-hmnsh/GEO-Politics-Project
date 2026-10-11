# Statecraft 3.0 — Diplomacy and Negotiation

Diplomacy is a conversation that ends in a contract the engine can enforce.

## 1. The owner's example, step by step

**Round 3, India's planning phase.** India writes: *"Russia se oil imports 40% kam karo."* The card `RESTRICT_IMPORT oil ← RUS 40%, 3 rounds, public` is confirmed.

**Russia's inbox, same phase.** A notice arrives:

```
India plans to cut oil imports from you by 40% for 3 rounds.
Your forecast: export revenue −$3.1B per round.
[Reply]  [Ignore]
```

Russia writes: *"Supply chalu rahegi agar India USA ke saath defence deal na kare."* The interpreter turns this into a proposal card:

```
PROPOSAL  Russia → India                         private
Russia gives   Oil supply at today's price, discount 5%
Russia wants   India makes no new defence deal with USA
Duration       3 rounds
If broken      Supply stops; trust −20
[Edit]  [Send]
```

**India's inbox.** India can:

- **Accept:** the deal becomes a treaty. India's own `RESTRICT_IMPORT` card is withdrawn automatically and the slot is returned.
- **Reject:** the original order stands. Russia sees "Rejected" and can act (for example `TARIFF` on Indian goods).
- **Counter:** India writes *"Theek hai, par discount 10% chahiye aur deal sirf 2 round."* A counter card shows the changed fields highlighted.

Only an accepted proposal enters the simulation.

## 2. The proposal card

```ts
type Proposal = {
  id: string;
  from: CountryCode;
  to: CountryCode;
  gives: Term[];        // what the sender commits to
  wants: Term[];        // what the sender asks for
  duration: number;     // rounds, 1–8
  onBreak?: Penalty;    // default: trust −20 and the deal ends
  visibility: "public" | "private";
  parentId?: string;    // set on a counter
  status: "sent" | "accepted" | "rejected" | "countered" | "expired";
};

type Term =
  | { kind: "flow"; verb: "BUY" | "SELL"; resource: Good; amount: Amount; price?: "market" | { discountPct: number } }
  | { kind: "money"; amountB: number; perRound: boolean }
  | { kind: "refrain"; verb: Verb; target?: CountryCode }   // "do not do X"
  | { kind: "support"; type: "diplomatic" | "vote" | "statement"; target?: CountryCode }
  | { kind: "lift"; verb: "TARIFF" | "RESTRICT_IMPORT" | "RESTRICT_EXPORT"; target: CountryCode };
```

Every term must map to something the engine can check each round. A term that cannot be checked ("be nice to us") is rejected by the interpreter with a suggestion ("Do you mean: no new tariffs on us?").

## 3. Rules

- A proposal costs no order slot. Accepting one costs no slot either. This keeps talking cheap and acting expensive.
- A leader can have at most 3 open proposals at a time, so inboxes stay readable.
- Proposals expire at round lock unless answered.
- A chain of counters is shown as one thread. The thread ends at accept, reject or expiry.
- Bots answer proposals with the 2.0 utility model ([2.0 GAME-DESIGN §11](../docs2.0/GAME-DESIGN.md#11-bots)): accept when the deal improves their score forecast, counter once, else reject.

## 4. Enforcement and broken promises

At each resolve the engine checks every active treaty term against the orders of that round.

- If a `refrain` term is broken (India signs a defence deal with the USA), the engine applies `onBreak`, ends the treaty and writes a cause chain: *Treaty broken → Russian supply stopped → oil price for India +9%.*
- The World Wire reports public breaks. Private breaks are known only to the two sides, until a leader makes a `STATEMENT` about it.
- Each leader carries a **Reliability** value (kept deals ÷ all deals) visible to every player. It feeds the Standing score dimension. Breaking a deal can still be the right move; it just has a visible price.

## 5. Public and private

| Item | Who sees it |
|---|---|
| Public orders (restrictions, tariffs, builds, statements) | Everyone, on the World Wire and the globe |
| Private orders | Owner only, until their effects show on the globe |
| Proposals | Sender and receiver; public only if the sender marks them public |
| Accepted treaties | Everyone sees that a treaty exists; terms are visible only if public |
| Broken treaties | Public if the treaty was public |

## 6. Later (after the slice)

- **Conditional orders (IF/THEN):** "If China raises tech tariffs above 20%, increase grain sales to Russia." Stored as a card with a `condition` checked at each resolve. Decision E-4.
- **Multi-party deals:** three or more countries in one treaty.
- **Free chat:** a short message thread beside the proposal cards, with moderation. Decision E-3.
- **Intelligence:** reveal another leader's private orders or open proposals at a cost.
