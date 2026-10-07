import { Header } from "@/components/chrome/Header";
import { Intro } from "@/components/chrome/Intro";
import { MapControls } from "@/components/chrome/MapControls";
import { MarketsNewsCard } from "@/components/chrome/MarketsNewsCard";
import { ModeCard } from "@/components/chrome/ModeCard";
import { ModeDock } from "@/components/chrome/ModeDock";
import { PanelHost } from "@/components/chrome/PanelHost";
import { PulseCard } from "@/components/chrome/PulseCard";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { HideDuringTour } from "@/components/learn/HideDuringTour";
import { StoryPlayer } from "@/components/learn/StoryPlayer";
import { TermFromUrl } from "@/components/learn/TermFromUrl";

// Landing screen (docs/UI-DESIGN.md §2). Layers and live data are added in M1.3–M1.7.
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
      <Intro />
      <Header />
      <HideDuringTour>
        <PulseCard />
        <ModeCard />
        <MapControls />
        <ModeDock />
        <MarketsNewsCard />
      </HideDuringTour>
      <PanelHost />
      <TermFromUrl />
      <StoryPlayer />
      <h1 className="sr-only">GeoPolitics: the world, explained</h1>
    </main>
  );
}
