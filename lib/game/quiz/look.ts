// Shared look for Then · Now · Next: one colour and icon per era.
import { Landmark, Radio, Telescope } from "lucide-react";
import type { Era } from "./types";

export const ERA_LOOK: Record<
  Era,
  {
    name: string;
    tag: string;
    line: string;
    color: string;
    ink: string;
    soft: string;
    icon: typeof Landmark;
  }
> = {
  then: {
    name: "Then",
    tag: "History",
    line: "What happened, and why it still matters",
    color: "#c8902a",
    ink: "#9a6a0c",
    soft: "rgba(242,179,61,.16)",
    icon: Landmark,
  },
  now: {
    name: "Now",
    tag: "Today",
    line: "The world today and this week's headlines",
    color: "#E5484D",
    ink: "#b5313a",
    soft: "rgba(229,72,77,.1)",
    icon: Radio,
  },
  next: {
    name: "Next",
    tag: "What next",
    line: "What happens if…",
    color: "#2B6A73",
    ink: "#1F5159",
    soft: "rgba(43,106,115,.1)",
    icon: Telescope,
  },
};
