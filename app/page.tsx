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
import { Chapters } from "@/components/home/Chapters";
import { StatecraftBand, Ticker, Outro } from "@/components/home/Finale";
import { ChapterDots, GlobeStage, HeroChrome, IslandNav, ScrollCue, StoryScrim } from "@/components/home/Stage";

// Landing screen (docs/UI-DESIGN.md §2). The globe stays pinned while the page scrolls: at the top it is the
// explorer; below, five chapters fly the camera through conflict, money, energy, force and alliances, and then
// Statecraft and the footer cover it.
export default function Home() {
  return (
    <main className="relative bg-paper">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(48% 62% at 50% 52%, #d7e3ea 0%, rgba(215,227,234,.6) 45%, rgba(243,241,236,0) 75%), radial-gradient(35% 40% at 92% 12%, rgba(200,214,222,.7), rgba(243,241,236,0) 70%), linear-gradient(180deg,#f6f4ef,#efede7)",
        }}
      />
      <GlobeStage>
        <GlobeClient />
      </GlobeStage>
      <HeroChrome>
        <Header />
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
      </HeroChrome>
      <StoryPlayer />
      <StoryScrim />
      <h1 className="sr-only">GeoPolitics: the world, explained</h1>
      {/* click-through over the globe; each section turns input back on for its own content */}
      <div className="pointer-events-none relative z-10">
        <Chapters />
        <Ticker />
        {/* from here on the page is opaque and the globe stops rendering */}
        <div id="globe-cover" data-chapter={5} className="pointer-events-auto bg-paper">
          <StatecraftBand />
          <Outro />
        </div>
      </div>
      <ChapterDots />
      <IslandNav />
    </main>
  );
}
