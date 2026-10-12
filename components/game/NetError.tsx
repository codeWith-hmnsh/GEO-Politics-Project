"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { useGame } from "@/lib/game/store";

/** Short notice when the server refuses an action (multiplayer). */
export function NetError() {
  const err = useGame((s) => s.netError);
  const clear = useGame((s) => s.setNetError);
  useEffect(() => {
    if (!err) return;
    const id = setTimeout(() => clear(null), 5000);
    return () => clearTimeout(id);
  }, [err, clear]);
  if (!err) return null;
  return (
    <motion.div role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--night)] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-card)]">
      {err}
    </motion.div>
  );
}
