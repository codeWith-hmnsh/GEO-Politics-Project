import { GlobeClient } from "@/components/globe/GlobeClient";

// M1.1: satellite globe with camera, borders and states. Cards, layers and data arrive in M1.2+ (docs/BUILD-PLAN.md).
export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(48% 62% at 50% 52%, #d7e3ea 0%, rgba(215,227,234,.6) 45%, rgba(243,241,236,0) 75%), radial-gradient(35% 40% at 92% 12%, rgba(200,214,222,.7), rgba(243,241,236,0) 70%), linear-gradient(180deg,#f6f4ef,#efede7)",
        }}
      />
      <GlobeClient />
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex h-[72px] items-center gap-3 px-6">
        <span className="grid size-[42px] place-items-center rounded-full bg-[var(--ink-strong)]">
          <span className="relative block h-4 w-[26px]">
            <span className="absolute left-0 top-0 size-4 rounded-full bg-gold" />
            <span className="absolute right-0 top-0 size-4 rounded-full border-[2.5px] border-white" />
          </span>
        </span>
        <span>
          <b className="block text-[22px] leading-none font-bold tracking-tight">GeoPolitics</b>
          <small className="mt-1 block text-[12.5px] text-ink-2">The world, explained</small>
        </span>
      </header>
      <h1 className="sr-only">GeoPolitics: the world, explained</h1>
    </main>
  );
}
