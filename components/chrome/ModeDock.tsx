"use client";

import { ChartNoAxesColumn, Globe, Shield, Users, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { flags } from "@/config/flags";
import { useGlobe, type Mode } from "@/lib/store";

const MODES: { id: Mode; label: string; Icon: typeof Globe; enabled: boolean; when: string }[] = [
  { id: "home", label: "Global Pulse", Icon: Globe, enabled: true, when: "" },
  { id: "economy", label: "Economy", Icon: ChartNoAxesColumn, enabled: flags.economyMode, when: "Coming in the next release" },
  { id: "defense", label: "Defense", Icon: Shield, enabled: flags.defenseMode, when: "Coming in the next release" },
  { id: "energy", label: "Energy", Icon: Zap, enabled: flags.energyMode, when: "Coming later" },
  { id: "diplomacy", label: "Diplomacy", Icon: Users, enabled: flags.diplomacyMode, when: "Coming later" },
];

/** Bottom-left mode switcher; the active item is a dark pill that slides between items. */
export function ModeDock() {
  const mode = useGlobe((s) => s.mode);
  const setMode = useGlobe((s) => s.setMode);

  return (
    <nav
      aria-label="Mode"
      className="fixed bottom-[22px] left-[22px] z-20 flex max-w-[calc(100%-44px)] gap-1 overflow-x-auto rounded-2xl bg-[var(--glass)] p-2 shadow-[var(--shadow-card)] backdrop-blur-xl [scrollbar-width:none] max-md:inset-x-3 max-md:bottom-3 max-md:max-w-none max-md:p-1.5"
    >
      {MODES.map(({ id, label, Icon, enabled, when }) => {
        const active = mode === id;
        const button = (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-disabled={!enabled}
            onClick={() => enabled && setMode(id)}
            className={`relative flex h-12 shrink-0 items-center gap-2.5 rounded-xl px-5 text-[14.5px] font-medium whitespace-nowrap transition-colors max-md:h-[42px] max-md:px-3.5 max-md:text-[13.5px] ${
              active ? "text-white" : enabled ? "hover:bg-ink/5" : "text-ink-3"
            }`}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-xl bg-[var(--ink-strong)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative size-[18px]" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        );
        return enabled ? (
          button
        ) : (
          <Tooltip key={id}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{when}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
