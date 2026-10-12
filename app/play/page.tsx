import type { Metadata } from "next";
import { PlayLanding } from "@/components/game/PlayLanding";

export const metadata: Metadata = {
  title: "Statecraft · GeoPolitics",
  description: "Run a country. Shape the world. Six leaders, twelve years, one shared world that answers back.",
};

// Statecraft Play page (docs4.0 BUILD-PLAN S4). The match itself lives at /play/match.
export default function PlayPage() {
  return <PlayLanding />;
}
