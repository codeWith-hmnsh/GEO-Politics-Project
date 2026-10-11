import type { Metadata } from "next";
import { PlayScreen } from "@/components/game/PlayScreen";

export const metadata: Metadata = {
  title: "Statecraft · GeoPolitics",
  description: "Lead a real country for twelve years. Budget, build, trade and negotiate on a living globe.",
};

// Statecraft solo match (docs4.0 BUILD-PLAN S3). The engine runs in the browser.
export default function PlayPage() {
  return <PlayScreen />;
}
