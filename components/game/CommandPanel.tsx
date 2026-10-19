"use client";

import { AlertTriangle, CalendarDays, Check, ChevronRight, Handshake, Hammer, Lock, SlidersHorizontal, Sparkles, Wallet, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Flag } from "@/components/chrome/Flag";
import { suggestDeal, type Goal } from "@/lib/game/advisor";
import { CARDS, CARD_BY_ID, cardCost, cardLegal, type CardDef } from "@/lib/game/engine/cards";
import { CRISIS_BY_ID, EVENT_BY_ID, SCENARIOS } from "@/lib/game/engine/events";
import { PROJECTS, PROJECT_BY_ID, projectCost, projectLegal } from "@/lib/game/engine/projects";
import { REGION_DEFS } from "@/lib/game/engine/regions";
import { MISSIONS } from "@/lib/game/engine/score";
import { proposalLegal, termsCost, termsValue } from "@/lib/game/engine/treaties";
import type { CardParams, Good, Iso3, Ministry, Term, WorldState } from "@/lib/game/engine/types";
import { GOODS, MINISTRIES, REGIONS, SEATS } from "@/lib/game/engine/types";
import { RESOLUTION_BY_ID } from "@/lib/game/engine/votes";
import { moneyCommitted, pcLeft, useGame, type Tab, type UIProposal } from "@/lib/game/store";
import { GOOD_WORD, SHORT, cap, cardName, money, unitsAsShare } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, Delta, MoveDots, eyebrow, glass } from "./bits";
import { ResultView } from "./ResultView";

const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: "year", label: "This year", icon: CalendarDays },
  { id: "moves", label: "Moves", icon: Zap },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
];
/** Left-edge colours for a crisis's choices, so each option reads as its own path. */
const BRANCH = ["#3F63D8", "#E8A21C", "#E5484D", "#7A4FD0"];
const GROUP: Record<CardDef["group"], { name: string; color: string }> = {
  economy: { name: "Economy", color: "#3F63D8" },
  trade: { name: "Trade", color: "#17A2B8" },
  energy: { name: "Energy", color: "#E8A21C" },
  food: { name: "Food", color: "#5E9E3A" },
  people: { name: "People", color: "#C25A84" },
  diplomacy: { name: "Diplomacy", color: "#7A4FD0" },
};
const MIN_NAME: Record<Ministry, string> = { industry: "Industry & Jobs", infrastructure: "Infrastructure", agriculture: "Agriculture", energy: "Energy", education: "Education", welfare: "Health & Welfare", defence: "Defence" };

export function CommandPanel() {
  const phase = useGame((s) => s.phase);
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const inbox = useGame((s) => s.proposals.filter((p) => p.inbox && p.status === "pending").length);
  if (phase === "pick" || phase === "end") return null;
  const hidden = phase === "reveal";
  return (
    <motion.aside
      aria-label="Your decisions"
      initial={false}
      animate={{ opacity: hidden ? 0 : 1, x: hidden ? 40 : 0 }}
      transition={{ duration: 0.35, ease: ease.out }}
      className={cn(glass, "fixed top-[92px] right-4 bottom-4 z-20 flex w-[420px] flex-col overflow-hidden max-[1100px]:w-[380px] max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[58dvh] max-md:w-auto max-md:rounded-b-none", hidden && "pointer-events-none")}
    >
      {phase === "result" ? (
        <ResultView />
      ) : (
        <>
          <nav role="tablist" className="m-2.5 mb-0 flex gap-1 rounded-[14px] bg-[rgba(17,35,43,.05)] p-1" data-coach="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("relative flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-1 py-2 text-[12.5px] font-bold transition", tab === t.id ? "bg-white text-ink shadow-[0_2px_8px_rgba(17,35,43,.12)]" : "text-ink-3 hover:text-ink")}
              >
                <t.icon className="size-3.5 max-[1100px]:hidden" aria-hidden />
                {t.label}
                {t.id === "deals" && inbox > 0 && <span className="absolute -top-1 -right-0.5 grid size-4 place-items-center rounded-full bg-[var(--conflict)] text-[10px] text-white ring-2 ring-white">{inbox}</span>}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto px-[18px] pt-4 pb-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {tab === "year" && <YearPane />}
                {tab === "moves" && <MovesPane />}
                {tab === "deals" && <DealsPane />}
                {tab === "advanced" && <AdvancedPane />}
              </motion.div>
            </AnimatePresence>
          </div>
          <Tray />
        </>
      )}
    </motion.aside>
  );
}

// ───────── This year ─────────

function YearPane() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const goal = useGame((s) => s.goal);
  const recs = useGame((s) => s.recs);
  const apply = useGame((s) => s.applyRecommendation);
  const orders = useGame((s) => s.orders);
  const last = world.history.at(-1);
  const ev = last?.eventId ? EVENT_BY_ID.get(last.eventId) : undefined;
  const headline = ev ? ev.title : world.turn === 1 ? SCENARIOS[world.scenario].name : "A new year";
  const sub = ev ? (last?.news.find((n) => n.place)?.place ?? "") : world.turn === 1 ? SCENARIOS[world.scenario].brief : "";
  const c = world.countries[me];
  const prog = MISSIONS[me].progress(world, c);

  return (
    <div className="grid gap-5">
      <div>
        <div className={eyebrow}>{world.year} · Briefing</div>
        <h2 className="mt-1.5 font-display text-[25px] leading-tight font-semibold tracking-tight">{headline}</h2>
        {sub && <p className="mt-1.5 text-[14px] text-ink-2">{sub}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-bold">
          <PriceChip label="Oil" v={world.price.energy} />
          <PriceChip label="Food" v={world.price.food} />
          <PriceChip label="Chips" v={world.price.tech} />
          <span className="rounded-full border border-border bg-paper px-2.5 py-1">Tension {world.tension.toFixed(0)}</span>
        </div>
      </div>

      {goal && (
        <section data-coach="goal" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A2C35] to-[var(--ink-strong)] p-4 text-[var(--paper)] shadow-[0_14px_34px_rgba(15,29,36,.28)]">
          <i aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(242,179,61,.42),transparent_70%)]" />
          <div className="relative flex items-center gap-1.5 text-[11px] font-extrabold tracking-[.14em] text-[var(--gold)] uppercase">
            <TargetIcon /> Your goal this year
          </div>
          <h3 className="relative mt-1 font-display text-[23px] font-semibold">{goal.title}</h3>
          <p className="relative mt-1 text-[13.5px] text-white/75">{goal.detail}</p>
          {goal.metric && <GoalBar m={goal.metric} />}
        </section>
      )}

      <section data-coach="recs">
        <div className={cn(eyebrow, "mb-2 flex items-center gap-1.5")}>
          <Sparkles className="size-3.5" aria-hidden /> Your advisor recommends
        </div>
        <div className="grid gap-2">
          {recs.length === 0 && <p className="text-[13.5px] text-ink-3">No more moves recommended. You can lock the turn, or explore Moves and Deals.</p>}
          {recs.map((r, i) => (
            <div key={`${r.kind}-${r.kind === "deal" ? r.to : r.id}`} className="relative grid grid-cols-[34px_1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-white p-3 transition hover:shadow-[var(--shadow-card)]">
              <i aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: REC_COLOR[r.kind] }} />
              <span className="relative grid size-[34px] place-items-center rounded-xl" style={{ background: `${REC_COLOR[r.kind]}1a`, color: REC_COLOR[r.kind] }}>
                {r.kind === "card" ? <Sparkles className="size-4" /> : r.kind === "project" ? <Hammer className="size-4" /> : <Handshake className="size-4" />}
                <b className="absolute -top-1.5 -left-1.5 grid size-[18px] place-items-center rounded-full bg-[var(--ink-strong)] text-[10px] text-white ring-2 ring-white">{i + 1}</b>
              </span>
              <div className="min-w-0">
                <div className="text-[14px] leading-snug font-extrabold">{r.title}</div>
                <div className="text-[12.5px] text-ink-2">{r.why}</div>
                <div className="mt-1 flex flex-wrap gap-x-2 text-[12px] font-bold">
                  <span className="text-[var(--up)]">{r.effect}</span>
                  <span className="text-ink-3">{r.cost}</span>
                </div>
              </div>
              <Btn className="min-h-9 px-3.5 text-[13px]" onClick={() => apply(r)}>
                Do it
              </Btn>
            </div>
          ))}
        </div>
      </section>

      <VoteCard />
      <Warnings />
      {(world.pendingCrises[me] ?? []).map((id) => (
        <CrisisCard key={id} id={id} chosen={orders.crisis?.[id]} />
      ))}

      <section className="rounded-2xl border border-border bg-paper p-3.5">
        <div className={eyebrow}>Your mission · worth up to 120 points</div>
        <div className="mt-1 text-[14px] font-extrabold">{MISSIONS[me].text}</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2ded4]">
          <i className="block h-full rounded-full bg-gradient-to-r from-[#B9821A] to-[var(--gold)] transition-[width] duration-700" style={{ width: `${prog * 100}%` }} />
        </div>
      </section>
    </div>
  );
}

function PriceChip({ label, v }: { label: string; v: number }) {
  return (
    <span className="rounded-full border border-border bg-paper px-2.5 py-1">
      {label} {v.toFixed(0)}
      {v >= 108 ? <span className="text-[var(--down)]"> ▲</span> : v <= 92 ? <span className="text-[var(--up)]"> ▼</span> : null}
    </span>
  );
}

function GoalBar({ m }: { m: NonNullable<Goal["metric"]> }) {
  const fmt = (v: number) => (m.unit === "$B" ? money(v) : `${v.toFixed(m.unit === "%" ? 0 : 0)}${m.unit === "%" ? "%" : ""}`);
  const pct = m.lowerIsBetter ? Math.max(0, Math.min(1, m.target / Math.max(m.now, 0.01))) : Math.max(0, Math.min(1, m.now / Math.max(m.target, 0.01)));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[12px] font-bold text-white/70">
        <span>{m.label}</span>
        <span className="tabular-nums">
          now {fmt(m.now)} · goal {m.lowerIsBetter ? "≤" : "≥"} {fmt(m.target)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
        <i className="block h-full rounded-full bg-[var(--gold)]" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function VoteCard() {
  const world = useGame((s) => s.world)!;
  const vote = useGame((s) => s.orders.vote);
  const setVote = useGame((s) => s.setVote);
  if (!world.vote) return null;
  const res = RESOLUTION_BY_ID.get(world.vote.resolutionId)!;
  return (
    <section className="rounded-2xl border border-[rgba(17,35,43,.16)] bg-white p-3.5">
      <div className={eyebrow}>World Vote · passes with 4 of 6 · votes stay secret until the reveal</div>
      <h4 className="mt-1 font-display text-[18px] font-semibold">{res.title(world.vote.target, world)}</h4>
      <p className="text-[12.5px] text-ink-2">
        Good for {res.goodFor}. Bad for {res.badFor}.
      </p>
      <div className="mt-2.5 flex gap-1.5">
        {(["yes", "no", "abstain"] as const).map((v) => (
          <button key={v} onClick={() => setVote(vote === v ? null : v)} className={cn("min-h-9 flex-1 rounded-full border text-[13px] font-bold", vote === v ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[rgba(17,35,43,.16)]")}>
            {cap(v)}
          </button>
        ))}
      </div>
    </section>
  );
}

function Warnings() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const setTab = useGame((s) => s.setTab);
  const list = world.warnings[me] ?? [];
  if (!list.length) return null;
  return (
    <section className="grid gap-2">
      {list.map((w) => (
        <div key={w.id} className="grid grid-cols-[20px_1fr] gap-2.5 rounded-xl border border-[rgba(232,162,28,.35)] bg-[rgba(232,162,28,.1)] p-3">
          <AlertTriangle className="mt-0.5 size-[18px] text-[#8a5b00]" aria-hidden />
          <div>
            <b className="text-[13.5px]">{w.text}</b>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {w.cards.map((id) => (
                <button key={id} onClick={() => setTab(id === "diplomacy.proposeDeal" ? "deals" : "moves")} className="rounded-full border border-[rgba(17,35,43,.16)] bg-white px-2.5 py-0.5 text-[12px] font-semibold">
                  {cardName(id)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function CrisisCard({ id, chosen }: { id: string; chosen?: string }) {
  const choose = useGame((s) => s.chooseCrisis);
  const cr = CRISIS_BY_ID.get(id);
  if (!cr) return null;
  const def = cr.choices.find((x) => x.id === cr.defaultChoice)!;
  return (
    <section className="overflow-hidden rounded-2xl border border-[rgba(229,72,77,.3)] bg-white shadow-[0_10px_30px_rgba(229,72,77,.08)]">
      <div className="flex items-center gap-2 bg-[rgba(229,72,77,.08)] px-3.5 py-2 text-[11px] font-extrabold tracking-[.14em] text-[var(--down)] uppercase">
        <AlertTriangle className="size-3.5" aria-hidden /> Decision · your call
      </div>
      <div className="p-3.5 pt-3">
      <div className="text-[12px] font-semibold text-ink-3">If you do not choose: {def.label}</div>
      <h4 className="mt-1 font-display text-[19px] leading-tight font-semibold">{cr.title}</h4>
      <p className="text-[13.5px] text-ink-2">{cr.body}</p>
      <div className="mt-2.5 grid gap-1.5">
        {cr.choices.map((ch, i) => (
          <button key={ch.id} onClick={() => choose(id, ch.id)} style={{ borderLeftColor: BRANCH[i % BRANCH.length] }} className={cn("rounded-xl border border-l-4 px-3 py-2.5 text-left text-[13.5px] font-bold transition", chosen === ch.id ? "border-[var(--ink-strong)] bg-white shadow-[inset_0_0_0_1px_var(--ink-strong),0_6px_16px_rgba(17,35,43,.1)]" : "border-[rgba(17,35,43,.16)] bg-paper hover:bg-white")}>
            {ch.label}
            <small className="block text-[12px] font-semibold text-ink-3">{ch.forecast}</small>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 text-[13px]">
        <p>
          <b className="text-ink-3">Finance:</b> {cr.advisors.finance}
        </p>
        <p>
          <b className="text-ink-3">Foreign affairs:</b> {cr.advisors.foreign}
        </p>
        <p>
          <b className="text-ink-3">People:</b> {cr.advisors.people}
        </p>
      </div>
      </div>
    </section>
  );
}

const REC_COLOR: Record<"card" | "project" | "deal", string> = { card: "#3F63D8", project: "#B9821A", deal: "#2FA36B" };

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

// ───────── Moves ─────────

function MovesPane() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const left = useGame(pcLeft);
  const [all, setAll] = useState(false);
  const ids = world.countries[me].shownCards.filter((x) => x !== "diplomacy.proposeDeal");
  return (
    <div className="grid gap-4">
      <div>
        <div className={eyebrow}>{world.year} · Moves</div>
        <h2 className="mt-1.5 font-display text-[24px] font-semibold">Moves that matter now</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          You have <b>{left}</b> move{left === 1 ? "" : "s"} left this year. Each card shows what it costs.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
        {ids.map((id) => (
          <CardTile key={id} id={id} />
        ))}
      </div>
      <Btn variant="glass" onClick={() => setAll(true)}>
        All actions ({CARDS.length - 2}) <ChevronRight className="size-4" />
      </Btn>
      <Sheet open={all} onOpenChange={setAll}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-paper sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">All actions</SheetTitle>
          </SheetHeader>
          <div className="grid gap-5 px-4 pb-8">
            {(Object.keys(GROUP) as CardDef["group"][]).map((g) => (
              <div key={g}>
                <div className="mb-2 text-[11px] font-extrabold tracking-[.14em] uppercase" style={{ color: GROUP[g].color }}>
                  {GROUP[g].name}
                </div>
                <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                  {CARDS.filter((k) => k.group === g && k.id !== "diplomacy.cancelTreaty" && k.id !== "diplomacy.proposeDeal").map((k) => (
                    <CardTile key={k.id} id={k.id} onDone={() => setAll(false)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CardTile({ id, onDone }: { id: string; onDone?: () => void }) {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const orders = useGame((s) => s.orders);
  const left = useGame(pcLeft);
  const add = useGame((s) => s.addCard);
  const card = CARD_BY_ID.get(id)!;
  const defaults = useMemo(() => (card.defaults ? card.defaults(world, me) : {}), [card, world, me]);
  const [draft, setDraft] = useState<CardParams>({});
  const params: CardParams = { ...(defaults ?? {}), ...draft };
  const played = (orders.cards ?? []).some((c) => c.cardId === id);
  const legal = played ? "In your orders" : left < card.pc ? `Needs ${card.pc} move${card.pc > 1 ? "s" : ""}` : defaults === null ? "Not possible now" : cardLegal(world, me, id, params);
  const cost = cardCost(world, me, card, params);
  const g = GROUP[card.group];
  return (
    <div style={{ background: `linear-gradient(180deg, ${g.color}14, #fff 55%)` }} className={cn("relative flex min-h-[136px] flex-col gap-1.5 overflow-hidden rounded-[14px] border border-border p-3.5 text-left transition", legal === true ? "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]" : "opacity-55")}>
      <i className="absolute inset-x-0 top-0 h-[3px]" style={{ background: g.color }} />
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-extrabold tracking-[.14em] uppercase" style={{ color: g.color }}>
          {g.name}
        </span>
        <span className="text-[11px] font-bold text-ink-3">
          {card.pc === 0 ? "free" : `${card.pc} move${card.pc > 1 ? "s" : ""}`}
          {cost ? ` · ${money(cost)}` : ""}
        </span>
      </div>
      <b className="text-[15px] leading-tight">{card.name}</b>
      <span className="text-[12.5px] leading-snug text-ink-2">{card.summary}</span>
      {card.params.length > 0 && legal !== "In your orders" && <ParamPicker card={card} params={params} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />}
      <div className="mt-auto pt-1">
        {legal === true ? (
          <button
            className="text-[12.5px] font-extrabold text-[var(--neutral)] hover:underline"
            onClick={() => {
              add(id, params);
              onDone?.();
            }}
          >
            Add to orders →
          </button>
        ) : (
          <span className="text-[12px] font-bold text-ink-3">{legal}</span>
        )}
      </div>
    </div>
  );
}

function ParamPicker({ card, params, onChange }: { card: CardDef; params: CardParams; onChange: (p: CardParams) => void }) {
  const me = useGame((s) => s.setup.me);
  const sel = "rounded-full border border-[rgba(17,35,43,.16)] bg-paper px-2 py-0.5 text-[12px] font-bold";
  return (
    <div className="flex flex-wrap gap-1.5">
      {card.params.map((k) => {
        if (k === "target" || k === "targetOrRegion")
          return (
            <select
              key={k}
              aria-label="Target"
              className={sel}
              value={params.region ? `R:${params.region}` : (params.target ?? "")}
              onChange={(e) => (e.target.value.startsWith("R:") ? onChange({ region: e.target.value.slice(2) as never, target: undefined }) : onChange({ target: e.target.value as Iso3, region: undefined }))}
            >
              {SEATS.filter((s) => s !== me).map((s) => (
                <option key={s} value={s}>
                  {SHORT[s]}
                </option>
              ))}
              {k === "targetOrRegion" &&
                REGIONS.map((r) => (
                  <option key={r} value={`R:${r}`}>
                    {REGION_DEFS[r].name}
                  </option>
                ))}
            </select>
          );
        if (k === "region")
          return (
            <select key={k} aria-label="Region" className={sel} value={params.region} onChange={(e) => onChange({ region: e.target.value as never })}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_DEFS[r].name}
                </option>
              ))}
            </select>
          );
        if (k === "rate")
          return (
            <select key={k} aria-label="Rate" className={sel} value={params.rate ?? 10} onChange={(e) => onChange({ rate: +e.target.value })}>
              <option value={10}>10%</option>
              <option value={25}>25%</option>
            </select>
          );
        if (k === "good")
          return (
            <select key={k} aria-label="Good" className={sel} value={params.good} onChange={(e) => onChange({ good: e.target.value as Good })}>
              {GOODS.map((g) => (
                <option key={g} value={g}>
                  {GOOD_WORD[g]}
                </option>
              ))}
            </select>
          );
        if (k === "units")
          return (
            <select key={k} aria-label="Amount" className={sel} value={params.units ?? 4} onChange={(e) => onChange({ units: +e.target.value })}>
              {[2, 4, 6, 8].map((u) => (
                <option key={u} value={u}>
                  {u} units
                </option>
              ))}
            </select>
          );
        return null;
      })}
    </div>
  );
}

// ───────── Deals ─────────

function DealsPane() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const proposals = useGame((s) => s.proposals);
  const compose = useGame((s) => s.compose);
  const setCompose = useGame((s) => s.setCompose);
  const left = useGame(pcLeft);
  const inbox = proposals.filter((p) => p.inbox);
  const mine = proposals.filter((p) => !p.inbox);
  const treaties = world.treaties.filter((t) => t.a === me || t.b === me);
  const suggested = useMemo(() => suggestDeal(world, me), [world, me]);
  return (
    <div className="grid gap-5">
      <div>
        <div className={eyebrow}>{world.year} · Deals</div>
        <h2 className="mt-1.5 font-display text-[24px] font-semibold">Trade and promises</h2>
        <p className="mt-1 text-[14px] text-ink-2">A proposal uses 1 move. Answering is free. Tip: tap a country on the globe to offer it a deal.</p>
      </div>
      <section>
        <div className={cn(eyebrow, "mb-2")}>Offers to you</div>
        {inbox.length ? <div className="grid gap-2">{inbox.map((p) => <PropCard key={p.id} p={p} />)}</div> : <p className="text-[13.5px] text-ink-3">No offers this year.</p>}
      </section>
      {mine.length > 0 && (
        <section>
          <div className={cn(eyebrow, "mb-2")}>Your proposals</div>
          <div className="grid gap-2">{mine.map((p) => <PropCard key={p.id} p={p} />)}</div>
        </section>
      )}
      <section>
        {compose ? (
          <Composer />
        ) : (
          <div className="grid gap-2">
            {suggested && (
              <Btn variant="primary" disabled={left < 1} onClick={() => setCompose({ to: suggested.to, gives: suggested.gives, wants: suggested.wants, turns: suggested.turns })}>
                <Handshake className="size-4" /> Suggested: {GOOD_WORD[suggested.good]} from {SHORT[suggested.to]}
              </Btn>
            )}
            <Btn variant="glass" disabled={left < 1} onClick={() => setCompose({ to: null, gives: [], wants: [], turns: 3 })}>
              New proposal · 1 move
            </Btn>
          </div>
        )}
      </section>
      <section>
        <div className={cn(eyebrow, "mb-2")}>Your treaties</div>
        {treaties.length ? (
          <div className="grid gap-2">
            {treaties.map((t) => {
              const other = t.a === me ? t.b : t.a;
              const give = t.a === me ? t.aGives : t.bGives;
              const get = t.a === me ? t.bGives : t.aGives;
              return (
                <div key={t.id} className="rounded-xl border border-border bg-white p-3 text-[13px]">
                  <b className="flex items-center gap-2">
                    <Flag iso3={other} /> {SHORT[other]} · {t.turnsLeft} year{t.turnsLeft > 1 ? "s" : ""} left
                  </b>
                  <div className="text-ink-2">You give: {give.map((x) => termWords(x, world, me)).join(", ") || "nothing"}</div>
                  <div className="text-ink-2">You get: {get.map((x) => termWords(x, world, me)).join(", ") || "nothing"}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13.5px] text-ink-3">No treaties yet.</p>
        )}
      </section>
    </div>
  );
}

function termWords(t: Term, w: WorldState, me: Iso3): string {
  if (t.kind === "goods") return `${unitsAsShare(t.units, w.countries[me].goods[t.good].demand, t.good)} a year${t.priceAdj ? ` at ${t.priceAdj > 0 ? "+" : ""}${Math.round(t.priceAdj * 100)}% price` : ""}`;
  if (t.kind === "money") return `${money(t.amount)} grant`;
  if (t.kind === "investment") return `${money(t.amount)} investment`;
  if (t.kind === "tariffCut") return "remove tariffs";
  return t.pledge === "noSanction" ? "promise: no sanctions" : `promise: stop buying from ${t.target}`;
}

function PropCard({ p }: { p: UIProposal }) {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const answer = useGame((s) => s.answerInbox);
  const other = p.inbox ? p.from : p.to;
  const give = p.inbox ? p.wants : p.gives;
  const get = p.inbox ? p.gives : p.wants;
  const status = p.thinking ? "thinking…" : p.counterOf ? `counter · ${p.status}` : p.status;
  const color = p.status === "accepted" ? "text-[var(--up)]" : p.status === "rejected" ? "text-[var(--down)]" : p.status === "countered" ? "text-[#b47a0a]" : "text-ink-3";
  return (
    <motion.div layout initial={{ rotateY: 60, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} className="grid gap-1.5 rounded-2xl border border-[rgba(17,35,43,.16)] bg-white p-3 text-[13px]">
      <div className="flex items-center gap-2 font-extrabold">
        <Flag iso3={other} /> {p.inbox ? `${SHORT[other]} offers` : `To ${SHORT[other]}`}
        <span className={cn("ml-auto text-[11px] tracking-[.1em] uppercase", color)}>{status}</span>
      </div>
      <div className="grid grid-cols-[66px_1fr] gap-x-2">
        <b className="text-[11px] tracking-[.06em] text-ink-3 uppercase">You give</b>
        <span>{give.map((x) => termWords(x, world, me)).join(", ") || "nothing"}</span>
        <b className="text-[11px] tracking-[.06em] text-ink-3 uppercase">You get</b>
        <span>{get.map((x) => termWords(x, world, me)).join(", ") || "nothing"}</span>
        <b className="text-[11px] tracking-[.06em] text-ink-3 uppercase">For</b>
        <span>
          {p.turns} years · trust {world.pairs[me][other].trust.toFixed(0)}
        </span>
      </div>
      {p.inbox && p.status === "pending" && (
        <div className="flex gap-1.5">
          <Btn className="min-h-8 px-3 text-[12.5px]" onClick={() => answer(p.id, "accept")}>
            Accept
          </Btn>
          <Btn variant="glass" className="min-h-8 px-3 text-[12.5px]" onClick={() => answer(p.id, "counter")}>
            Counter
          </Btn>
          <Btn variant="ghost" className="min-h-8 px-3 text-[12.5px]" onClick={() => answer(p.id, "reject")}>
            Reject
          </Btn>
        </div>
      )}
      {p.counterOf && p.status === "pending" && (
        <div className="flex gap-1.5">
          <Btn className="min-h-8 px-3 text-[12.5px]" onClick={() => answer(p.id, "acceptCounter")}>
            Accept counter
          </Btn>
          <Btn variant="ghost" className="min-h-8 px-3 text-[12.5px]" onClick={() => answer(p.id, "rejectCounter")}>
            Reject
          </Btn>
        </div>
      )}
    </motion.div>
  );
}

function Composer() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const c = useGame((s) => s.compose)!;
  const setCompose = useGame((s) => s.setCompose);
  const send = useGame((s) => s.sendProposal);
  const [kind, setKind] = useState<Record<"g" | "w", string>>({ g: "", w: "" });
  const [amt, setAmt] = useState<Record<"g" | "w", number>>({ g: 4, w: 4 });
  const update = (patch: Partial<typeof c>) => setCompose({ ...c, ...patch });
  const add = (side: "g" | "w", v: string) => {
    if (!v) return;
    const a = Math.max(1, amt[side]);
    const term: Term = GOODS.includes(v as Good) ? { kind: "goods", good: v as Good, units: Math.min(30, a), priceAdj: 0 } : v === "investment" || v === "money" ? { kind: v, amount: Math.min(a * 3, Math.round(world.countries[me].gdp * 0.03)) } : v === "tariffCut" ? { kind: "tariffCut" } : { kind: "pledge", pledge: "noSanction" };
    update(side === "g" ? { gives: [...c.gives, term] } : { wants: [...c.wants, term] });
    setKind((k) => ({ ...k, [side]: "" }));
  };
  const value = c.to ? (() => { const gain = termsValue(world, c.to!, c.gives, c.turns); const cost = termsCost(world, c.to!, c.wants, c.turns); return (gain - cost) / Math.max(1, gain + cost); })() : 0;
  const legal = c.to ? proposalLegal(world, { from: me, to: c.to, gives: c.gives, wants: c.wants, turns: c.turns }) : "Choose a country";
  const sel = "h-8 rounded-full border border-[rgba(17,35,43,.16)] bg-white px-2.5 text-[12.5px] font-semibold";
  const side = (s: "g" | "w") => (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {(s === "g" ? c.gives : c.wants).map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-strong)] py-1 pr-1.5 pl-2.5 text-[12px] font-bold text-white">
            {termWords(t, world, s === "g" ? me : me)}
            <button aria-label="Remove" className="size-[18px] rounded-full bg-white/20" onClick={() => update(s === "g" ? { gives: c.gives.filter((_, k) => k !== i) } : { wants: c.wants.filter((_, k) => k !== i) })}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label="Add a term" className={sel} value={kind[s]} onChange={(e) => add(s, e.target.value)}>
          <option value="">+ Add…</option>
          <option value="energy">Oil and gas</option>
          <option value="food">Food</option>
          <option value="tech">Chips</option>
          <option value="investment">Investment ($B)</option>
          <option value="money">Grant ($B)</option>
          <option value="tariffCut">Remove tariffs</option>
          <option value="noSanction">Promise: no sanctions</option>
        </select>
        <input aria-label="Amount" type="number" min={1} max={30} value={amt[s]} onChange={(e) => setAmt((x) => ({ ...x, [s]: +e.target.value }))} className={cn(sel, "w-[70px]")} />
      </div>
    </div>
  );
  return (
    <div className="grid gap-3 rounded-2xl border border-dashed border-[rgba(17,35,43,.2)] bg-gradient-to-b from-white to-paper p-3.5">
      <div className="grid grid-cols-[62px_1fr] items-start gap-2">
        <b className="pt-1.5 text-[11px] tracking-[.08em] text-ink-3 uppercase">To</b>
        <div className="flex flex-wrap gap-1.5">
          {SEATS.filter((s) => s !== me).map((s) => (
            <button key={s} onClick={() => update({ to: s })} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold", c.to === s ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[rgba(17,35,43,.16)] bg-white")}>
              <Flag iso3={s} /> {SHORT[s]}
            </button>
          ))}
        </div>
        <b className="pt-1.5 text-[11px] tracking-[.08em] text-ink-3 uppercase">You give</b>
        {side("g")}
        <b className="pt-1.5 text-[11px] tracking-[.08em] text-ink-3 uppercase">You want</b>
        {side("w")}
        <b className="pt-1.5 text-[11px] tracking-[.08em] text-ink-3 uppercase">Years</b>
        <div className="flex gap-1.5">
          {[2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => update({ turns: n })} className={cn("h-7 rounded-full border px-3 text-[12.5px] font-semibold", c.turns === n ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[rgba(17,35,43,.16)] bg-white")}>
              {n}
            </button>
          ))}
        </div>
      </div>
      {c.to && (
        <div>
          <div className="flex justify-between text-[12px] font-bold">
            <span>How good is this for {SHORT[c.to]}?</span>
            <span className="text-ink-3">{value > 0.15 ? "Likely yes" : value > -0.2 ? "Maybe: expect a counter" : "Likely no"}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-gradient-to-r from-[var(--conflict)] via-[var(--mixed)] to-[var(--ally)]">
            <i className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ink-strong)] bg-white transition-[left] duration-300" style={{ left: `${Math.max(4, Math.min(96, 50 + value * 60))}%` }} />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Btn className="min-h-9 px-4 text-[13px]" disabled={legal !== true} onClick={() => send()}>
          {c.free ? "Send counter" : "Send · 1 move"}
        </Btn>
        <Btn variant="ghost" className="min-h-9 px-3 text-[13px]" onClick={() => setCompose(null)}>
          Cancel
        </Btn>
      </div>
      {legal !== true && c.to && <span className="text-[12px] font-semibold text-ink-3">{legal}</span>}
    </div>
  );
}

// ───────── Advanced: budget + projects ─────────

function AdvancedPane() {
  return (
    <div className="grid gap-7">
      <BudgetSection />
      <ProjectsSection />
    </div>
  );
}

const MIN_COLOR: Record<Ministry, string> = { industry: "#3F63D8", infrastructure: "#17A2B8", agriculture: "#5E9E3A", energy: "#E8A21C", education: "#7A4FD0", welfare: "#C25A84", defence: "#5E6B70" };

function BudgetSection() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const orders = useGame((s) => s.orders);
  const setBudget = useGame((s) => s.setBudget);
  const setTax = useGame((s) => s.setTax);
  const reset = useGame((s) => s.resetBudget);
  const f = useGame((s) => s.forecast);
  const c = world.countries[me];
  const b = { ...c.budget, ...(orders.budget ?? {}) } as Record<Ministry, number>;
  const tax = orders.taxRate ?? c.taxRate;
  const total = MINISTRIES.reduce((t, m) => t + b[m], 0);
  const fc = f?.countries[me];
  return (
    <section>
      <div className={eyebrow}>
        <Wallet className="mr-1 inline size-3.5" /> Budget · optional
      </div>
      <h2 className="mt-1.5 font-display text-[22px] font-semibold">Where the money goes</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Revenue {money((c.gdp * tax) / 100)} · spending {money((c.gdp * total) / 100)}. Last year’s budget carries over.
      </p>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(17,35,43,.1)]" aria-hidden>
        {MINISTRIES.map((m) => (
          <i key={m} className="block h-full transition-[flex-grow] duration-300" style={{ flexGrow: b[m], background: MIN_COLOR[m] }} />
        ))}
      </div>
      <div className="mt-3 grid gap-1">
        <Slider label="Tax" value={tax} min={10} max={35} step={0.5} changed={tax !== c.taxRate} display={`${tax.toFixed(1)}%`} sub="of GDP" onChange={(v) => setTax(Math.abs(v - c.taxRate) < 0.01 ? null : v)} />
        {MINISTRIES.map((m) => {
          const d = ((b[m] - c.budget[m]) * c.gdp) / 100;
          return (
            <Slider
              key={m}
              label={MIN_NAME[m]}
              dot={MIN_COLOR[m]}
              value={b[m]}
              min={0}
              max={+(c.baseline[m] * 3).toFixed(2)}
              step={+(c.baseline[m] / 20).toFixed(3)}
              changed={Math.abs(d) >= 0.5}
              display={money((c.gdp * b[m]) / 100)}
              sub={Math.abs(d) >= 0.5 ? `${d > 0 ? "+" : "−"}${money(Math.abs(d))}` : `${b[m].toFixed(1)}%`}
              onChange={(v) => setBudget(m, Math.abs(v - c.budget[m]) < 0.0005 ? null : v)}
            />
          );
        })}
      </div>
      {fc && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-bold">
          <span className="rounded-full border border-border bg-paper px-2.5 py-1">
            Growth next year <Delta v={fc.growth - c.growth} d={2} />
          </span>
          <span className="rounded-full border border-border bg-paper px-2.5 py-1">
            Unemployment <Delta v={fc.unemployment - c.unemployment} d={2} invert />
          </span>
          <span className="rounded-full border border-border bg-paper px-2.5 py-1">
            Stability <Delta v={fc.stability - c.stability} d={1} />
          </span>
        </div>
      )}
      <Btn variant="glass" className="mt-3 min-h-9 px-4 text-[13px]" onClick={reset}>
        Reset to last year
      </Btn>
    </section>
  );
}

function Slider({ label, dot, value, min, max, step, changed, display, sub, onChange }: { label: string; dot?: string; value: number; min: number; max: number; step: number; changed: boolean; display: string; sub: string; onChange: (v: number) => void }) {
  const id = `sl-${label.replace(/\W/g, "")}`;
  return (
    <div className="grid grid-cols-[118px_1fr_74px] items-center gap-2.5 py-0.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-bold">
        {dot && <i className="size-2 rounded-full" style={{ background: dot }} />}
        {label}
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className={cn("w-full", changed ? "accent-[var(--gold)]" : "accent-[var(--ink-strong)]")} />
      <div className="text-right text-[13.5px] font-extrabold tabular-nums">
        {display}
        <small className={cn("block text-[11px] font-bold", changed ? "text-[#8a5b00]" : "text-ink-3")}>{sub}</small>
      </div>
    </div>
  );
}

function ProjectsSection() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const starting = useGame((s) => s.orders.projects ?? []);
  const add = useGame((s) => s.addProject);
  const c = world.countries[me];
  const used = c.projects.length + starting.length;
  return (
    <section>
      <div className={eyebrow}>
        <Hammer className="mr-1 inline size-3.5" /> Projects · optional
      </div>
      <h2 className="mt-1.5 font-display text-[22px] font-semibold">Build capabilities</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Slots: {used} of {c.slots} used. {c.slots === 1 ? "A 2nd slot opens when GDP grows 10%." : c.slots === 2 ? "A 3rd slot opens at GDP +25%." : "All slots open."}
      </p>
      <div className="mt-3 grid gap-2">
        {c.projects.map((p) => {
          const d = PROJECT_BY_ID.get(p.id)!;
          const done = d.turns - p.turnsLeft;
          return (
            <div key={p.id} className="grid gap-1.5 rounded-xl border border-border bg-white p-3">
              <div className="flex justify-between text-[13.5px] font-extrabold">
                {d.name}
                <span className="text-[12px] text-ink-3 tabular-nums">
                  {done} / {d.turns} years{p.paused ? " · paused: no money" : ""}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e2ded4]">
                <i className="block h-full bg-[var(--ink-strong)]" style={{ width: `${(done / d.turns) * 100}%` }} />
              </div>
            </div>
          );
        })}
        {c.completed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.completed.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-0.5 text-[12px] font-semibold">
                <Check className="size-3" /> {cardName(id)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 max-md:grid-cols-1">
        {PROJECTS.map((p) => {
          const legal = starting.includes(p.id) ? "Starting this year" : used >= c.slots ? "No free slot" : projectLegal(world, me, p.id);
          const cost = projectCost(c, p.id);
          return (
            <button key={p.id} disabled={legal !== true} onClick={() => add(p.id)} className="grid gap-1 rounded-[14px] border border-border bg-white p-3 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[var(--shadow-card)] disabled:opacity-50">
              <b className="text-[13.5px]">{p.name}</b>
              <small className="text-[12px] text-ink-2">{p.capability}</small>
              <span className="text-[12px] font-extrabold text-ink-3 tabular-nums">
                {money(cost)} · {p.turns} yr{p.turns > 1 ? "s" : ""}
              </span>
              {legal !== true && legal !== "No free slot" && <span className="text-[11px] font-bold text-[var(--down)]">{legal}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ───────── Orders tray ─────────

function Tray() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const orders = useGame((s) => s.orders);
  const proposals = useGame((s) => s.proposals);
  const phase = useGame((s) => s.phase);
  const removeCard = useGame((s) => s.removeCard);
  const removeProject = useGame((s) => s.removeProject);
  const resetBudget = useGame((s) => s.resetBudget);
  const setVote = useGame((s) => s.setVote);
  const lock = useGame((s) => s.lock);
  const left = useGame(pcLeft);
  const committed = useGame(moneyCommitted);
  const botLocks = useGame((s) => s.botLocks);
  const chips: { label: string; remove?: () => void }[] = [];
  if (orders.budget || orders.taxRate !== undefined) chips.push({ label: "Budget changes", remove: resetBudget });
  for (const p of orders.projects ?? []) chips.push({ label: `Build: ${cardName(p)}`, remove: () => removeProject(p) });
  (orders.cards ?? []).forEach((k, i) => chips.push({ label: cardName(k.cardId) + (k.params.target ? ` → ${SHORT[k.params.target]}` : k.params.region ? ` → ${REGION_DEFS[k.params.region].name}` : ""), remove: () => removeCard(i) }));
  for (const p of proposals.filter((x) => !x.inbox && !x.counterOf)) chips.push({ label: `Deal → ${SHORT[p.to]}: ${p.thinking ? "…" : p.status}` });
  for (const p of proposals.filter((x) => (x.inbox || x.counterOf) && x.status === "accepted")) chips.push({ label: `Pact with ${SHORT[p.inbox ? p.from : p.to]}` });
  if (orders.vote) chips.push({ label: `Vote: ${cap(orders.vote)}`, remove: () => setVote(null) });
  const locking = phase === "locking";
  const seats = useGame((s) => (s.net ? s.seats : null));
  // multiplayer: only other human leaders can keep the year open (bots and caretakers are always ready)
  const waiting = seats ? seats.filter((s) => !s.you && s.kind === "human" && !s.locked).length : SEATS.filter((s) => s !== me && !botLocks[s]).length;
  return (
    <div className="grid gap-2.5 border-t border-border bg-white/70 px-3.5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]" data-coach="lock">
      <div className="flex items-center justify-between text-[11px] font-extrabold tracking-[.1em] text-ink-3 uppercase">
        <span>Your orders · {world.year}</span>
        <span className="flex items-center gap-2 tabular-nums">
          Moves <MoveDots left={left} total={world.countries[me].pc} /> · {money(committed)}
        </span>
      </div>
      <div className="flex min-h-[30px] flex-wrap items-center gap-1.5">
        {chips.length === 0 && <span className="text-[12.5px] text-ink-3">Nothing yet. Doing nothing is a valid choice.</span>}
        <AnimatePresence initial={false}>
          {chips.map((c) => (
            <motion.span key={c.label} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className={cn("inline-flex items-center gap-1.5 rounded-[10px] border py-1 pr-1.5 pl-2.5 text-[12px] font-bold", locking ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-transparent" : "border-[rgba(17,35,43,.16)] bg-white")}>
              {c.label}
              {c.remove && !locking && (
                <button aria-label={`Remove ${c.label}`} onClick={c.remove} className="size-[18px] rounded-full bg-paper text-[12px] text-ink-2">
                  ×
                </button>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <Btn className={cn("min-h-[50px] w-full text-[15.5px]", locking && "bg-paper text-ink-2 shadow-none")} onClick={lock} disabled={locking}>
        {!locking && <Lock className="size-4" aria-hidden />}
        {locking ? `Waiting for ${waiting || "no"} leader${waiting === 1 ? "" : "s"}…` : "Lock turn"}
      </Btn>
    </div>
  );
}
