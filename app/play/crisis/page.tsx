import type { Metadata } from "next";
import { CrisisGame } from "@/components/crisis/CrisisGame";

export const metadata: Metadata = {
  title: "Crisis Table · Statecraft · GeoPolitics",
  description: "One crisis. Six leaders. Secret choices. Lead a real country through ten years of world crises.",
};

// Statecraft 5.0: the Crisis Table (solo against five bots). The classic match stays at /play/match.
export default function CrisisPage() {
  return <CrisisGame />;
}
