import { Flag } from "@/components/chrome/Flag";
import { SCENARIO_NAME, type Share } from "@/lib/game/share";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { Portrait } from "./bits";

/** The "My Statecraft" card shown at match end and on the public share page (GAME-DESIGN §13). */
export function ShareCard({ s }: { s: Share }) {
  return (
    <div className="relative grid gap-3 overflow-hidden rounded-[18px] border border-[rgba(122,92,46,.25)] bg-[var(--wire-paper)] p-6 shadow-[var(--shadow-card)]">
      <div className="absolute -top-16 -right-16 size-56 rounded-full bg-[radial-gradient(circle_at_35%_35%,#cfe3f2,#7aa2bd_55%,#3d6a85)] opacity-35" aria-hidden />
      <div className="text-[11px] font-extrabold tracking-[.14em] text-[var(--wire)] uppercase">My Statecraft</div>
      <div className="flex items-center gap-3">
        <Portrait i={s.p} seat={SEAT_COLOR[s.c]} size={52} />
        <div>
          <div className="flex items-center gap-2 font-display text-[34px] leading-none font-semibold">
            <Flag iso3={s.c} className="h-6 w-9 rounded" /> {SHORT[s.c]}
          </div>
          <div className="text-[13px] font-bold text-ink-3">
            {s.l} · {s.y0}–{s.y1}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          [`#${s.r0} → #${s.r1}`, "Power rank"],
          [String(s.s), s.w ? "Leader Score · Winner" : "Leader Score"],
          [String(s.g), "Regions led"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-[10px] bg-white/70 px-2.5 py-2">
            <b className="block text-[18px]">{v}</b>
            <small className="text-[11px] font-bold text-ink-3">{l}</small>
          </div>
        ))}
      </div>
      <p className="font-display text-[18px] text-[var(--wire-ink)] italic">“{s.a}”</p>
      <small className="text-[12px] text-ink-3">Statecraft · simulated match · {SCENARIO_NAME[s.sc]}</small>
    </div>
  );
}
