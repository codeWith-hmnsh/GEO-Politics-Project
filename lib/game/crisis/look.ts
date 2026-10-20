// Shared look for the Crisis Table: choice colours, meter names and icons.
import { Dices, Handshake, Hourglass, Package, Shield, ShieldCheck, Sprout, Swords, TrendingUp, Users, UsersRound, Zap } from "lucide-react";
import type { Choice, Meter, ResponseKind } from "./types";

export const KIND_LOOK: Record<ResponseKind, { name: string; color: string; soft: string; icon: typeof Users }> = {
  protect: { name: "Protect", color: "#9a6a0c", soft: "rgba(242,179,61,.18)", icon: ShieldCheck },
  invest: { name: "Invest", color: "#23855a", soft: "rgba(47,163,107,.12)", icon: Sprout },
  quick: { name: "Quick win", color: "#8a5d0b", soft: "rgba(232,162,28,.13)", icon: Zap },
  bet: { name: "Bet on the deal", color: "#2c4cb8", soft: "rgba(63,99,216,.1)", icon: Dices },
  tough: { name: "Hit back", color: "#b5313a", soft: "rgba(229,72,77,.1)", icon: Swords },
};

export const CHOICE_LOOK: Record<Choice, { name: string; color: string; ink: string; soft: string; icon: typeof Users }> = {
  coop: { name: "Cooperate", color: "#3F63D8", ink: "#2c4cb8", soft: "rgba(63,99,216,.1)", icon: UsersRound },
  self: { name: "Self-deal", color: "#E8A21C", ink: "#8a5d0b", soft: "rgba(232,162,28,.13)", icon: Package },
  hard: { name: "Escalate", color: "#E5484D", ink: "#b5313a", soft: "rgba(229,72,77,.1)", icon: Swords },
  wait: { name: "Wait", color: "#7E8A90", ink: "#4e5a60", soft: "rgba(126,138,144,.13)", icon: Hourglass },
};

export const METER_LOOK: Record<Meter, { name: string; icon: typeof Users; color: string }> = {
  economy: { name: "Economy", icon: TrendingUp, color: "#2fa36b" },
  people: { name: "People", icon: Users, color: "#c25a84" },
  military: { name: "Military", icon: Shield, color: "#5e6b70" },
  allies: { name: "Allies", icon: Handshake, color: "#3f63d8" },
};
