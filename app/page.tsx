import { Header } from "@/components/chrome/Header";
import { Intro } from "@/components/chrome/Intro";
import { MapControls } from "@/components/chrome/MapControls";
import { MarketsNewsCard } from "@/components/chrome/MarketsNewsCard";
import { DiplomacyCardHost } from "@/components/chrome/DiplomacyCardHost";
import { ModeCard } from "@/components/chrome/ModeCard";
import { ModeDock } from "@/components/chrome/ModeDock";
import { PanelHost } from "@/components/chrome/PanelHost";
import { PulseCard } from "@/components/chrome/PulseCard";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { HideDuringTour } from "@/components/learn/HideDuringTour";
import { StoryPlayer } from "@/components/learn/StoryPlayer";
import { TermFromUrl } from "@/components/learn/TermFromUrl";
import { HomeSections, ScrollCue } from "@/components/home/HomeSections";

// Landing screen (docs/UI-DESIGN.md §2). The globe hero is the first screen of a scrolling page: a transform on
// the hero makes its fixed-position chrome (cards, dock, panels) belong to it, so they scroll away with the globe.
export default function Home() {
  return (
    <main className="relative bg-paper">
      <div className="relative h-dvh overflow-hidden [transform:translateZ(0)]">
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
        <HideDuringTour>
          <PulseCard />
          <ModeCard />
          <DiplomacyCardHost />
          <MapControls />
          <ModeDock />
          <MarketsNewsCard />
          <ScrollCue />
        </HideDuringTour>
        <PanelHost />
        <TermFromUrl />
        <StoryPlayer />
        {/* soft hand-off from the globe into the page below */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-paper" />
      </div>
      <Header />
      <h1 className="sr-only">GeoPolitics: the world, explained</h1>
      <HomeSections />
    </main>
  );
}
