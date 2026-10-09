# Statecraft — Monetization

| Field | Value |
|---|---|
| Version | 1.0 (plan for review) |
| Date | 2026-10-10 |
| Status | **Decision D-1 open** — recommendation below |
| Related | [PRD.md](PRD.md) · [GAME-DESIGN.md](GAME-DESIGN.md) · [BUILD-PLAN.md](BUILD-PLAN.md) G8 |

**Rule zero: no payments until the metrics gate passes** (BUILD-PLAN G8): Day-7 return ≥ 12 %, rematch rate ≥ 40 %, ≥ 1,000 weekly active players. Money comes from people who already love the game.

---

## 1. The idea as proposed

> A leader runs out of money (war started, no cash for tanks) or sits at rank 2 and wants rank 1. They pay real money (e.g. $3) for in-game money (e.g. ₹100 crore) and use it to buy missiles or build 200 hospitals, raising their score to rank 1. The temptation to climb drives payment and retention.

The instinct is right: **the "so close to rank 1" feeling and the "I'm out of money" crisis are the two strongest emotions in this game.** The question is only what we sell at those moments.

## 2. Why selling in-game money for ranked play backfires

| Problem | What happens |
|---|---|
| **It breaks the ranking it sells** | If rank 1 can be bought, rank 1 stops meaning "best leader". Top players stop caring about rank; the temptation that drove payment disappears. |
| **One payer, nine losers** | In a 10-player match, one $3 purchase decides the outcome for 9 people who paid nothing. They feel cheated and do not come back. Multiplayer games die from the loss of non-payers, because payers need opponents. |
| **It deletes the best gameplay** | "No money for tanks" is where diplomacy happens: borrow from the IMF, beg Russia, sell oil, cut welfare. A buy button replaces the most interesting decision with a card payment. |
| **Brand** | 1.0 is a learning product for students and UPSC aspirants. "Pay to win the war" headlines would damage that trust and any classroom or school deal. |
| **Balance** | Score is improvement from your own start. Bought money makes that measurement meaningless. |

## 3. Recommended model (D-1, option A): pay for depth, comfort, style and access — never for power in ranked

Use the same two emotions, but sell things that do not change who wins ranked.

### 3.1 At "I'm rank 2, so close"
Sell **insight**, not points:
- **Advisor Debrief** (Premium): after each match, a breakdown of exactly where points were lost ("−47 Prosperity: inflation stayed above 8 % for 5 rounds after your fuel subsidy"), the 3 decisions that cost most, and what the rank-1 player did differently. The player gets better and climbs honestly.
- **Practice replays** (Premium): replay any Daily Crisis or your own match from any round with different decisions (unranked).

### 3.2 At "I'm out of money"
Keep it a gameplay moment (IMF, ally loan, bonds — all free in-game). Optionally, in **unranked/casual rooms only**, see option B.

### 3.3 Products

| Product | Price (India / global) | Contents |
|---|---|---|
| **Statecraft Premium** (subscription) | ₹149 / month · $3.99 / month | Advisor Debrief, practice replays, unlimited private rooms of 10 with custom settings, scenario editor, full replay viewer, Chronicle themes, no ads (if ads ever exist), priority Async notifications |
| **Leader Pass** (per 6-week season) | ₹99 / $1.99 | Season cosmetic track: leader portrait frames, office (HUD) themes, Chronicle mastheads, globe styles (vintage atlas, night), title flair. Free track exists too. |
| **Scenario packs** | ₹79–149 / $1.99–2.99 each | Historical and what-if starts: Cuban Missile Crisis 1962, Oil shock 1973, India 1991 balance-of-payments crisis, Cold War 1985. Educational, great for students and teachers. Unranked or separate leaderboards. |
| **Cosmetics** (one-off) | ₹29–199 | Emblem designer, avatar frames, seat pin styles. Never weapon skins. |
| **Classroom licence** (P2, B2B) | per class per year | Teacher dashboard, private 10-seat rooms, debrief sheets, no accounts needed for students |

What is **never** for sale: in-game money, force, goods, approval, score, rating, decision slots, timer extensions, information about other players in a live ranked match.

## 4. Option B (only if the owner insists): "Emergency Fund" in casual rooms

If the owner wants a direct "buy money" moment, this version limits the damage:

- Available only in **unranked rooms whose host enabled it**; never in Ranked, Quick Match, Daily Crisis or Async ranked.
- Once per match per player; amount = 2 % of the country's GDP (fair across countries).
- Arrives as an **emergency loan**: +treasury now, but debt +2.5 % GDP, rating −1 step, approval −3 ("emergency borrowing"). It helps survive a crisis, it cannot buy rank 1.
- The Chronicle and results mark the player as "Funded" for that match.
- All players in that room see the option enabled in the lobby before joining.

Option C (selling money in ranked) is **not recommended** for the reasons in §2.

## 5. Legal and platform limits

| Rule | Why |
|---|---|
| In-game money is **never cashable, transferable between players for value, or exchangeable for real money or prizes** | India's Promotion and Regulation of Online Gaming Act 2025 bans "online money games"; a social game stays permitted only while there are no stakes or monetary winnings. Paid subscriptions and cosmetic purchases are generally treated as permitted for social games; convertible currency is the line to avoid. |
| **No paid-entry tournaments with cash prizes** | Same Act. Free tournaments with non-cash rewards (badges, titles) are fine. |
| No loot boxes / random paid rewards | Gambling-like mechanics; regulated or banned in several countries; poor fit for a learning brand. |
| Native app stores (if ever) | Digital goods must use the store's in-app purchase system. |
| Vercel | Hobby plan forbids commercial use: move to Pro before the first payment. |
| Tax and invoices | GST on digital services in India; use a gateway that issues invoices (Razorpay for India, Stripe for international). |

This section summarises public commentary on the Act as of 2026-10 and is not legal advice. Get a short legal review before launching payments.

## 6. Rough revenue model (for planning only)

| Assumption | Value |
|---|---|
| Monthly active players at G8 | 10,000 |
| Premium conversion | 2–4 % |
| Leader Pass buyers per season | 5 % |
| Scenario pack buyers per month | 1 % |

At these assumptions: ~250–400 Premium subscribers (~₹40–60k / ~$500–800 per month) + Leader Pass (~500 × ₹99 per season) + packs. Enough to cover Vercel Pro, Supabase Pro and an optional narrator, and to fund growth. Real numbers come from the G6–G7 betas.

## 7. Implementation notes (G8)
- Entitlements table (`entitlements(player_id, sku, expires_at)`) checked server-side; the engine never reads it (no gameplay effect by construction).
- Payments via hosted checkout (Razorpay / Stripe) + webhook → entitlement; no card data touches our servers.
- A "What Premium does not do" line on the store page: *"Premium never changes who wins a ranked match."* This line is a feature.
