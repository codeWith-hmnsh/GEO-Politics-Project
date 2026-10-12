import type { Metadata } from "next";
import { PlayScreen } from "@/components/game/PlayScreen";

export const metadata: Metadata = {
  title: "Statecraft match · GeoPolitics",
  description: "Lead a real country for twelve years against five rival leaders.",
};

// Statecraft solo match (docs4.0 BUILD-PLAN S3). The engine runs in the browser.
export default function MatchPage() {
  return <PlayScreen />;
}
