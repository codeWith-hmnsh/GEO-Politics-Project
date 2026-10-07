"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useGlobe } from "@/lib/store";

/** "The world, explained." over the globe while the camera flies in; any input dismisses it. */
export function Intro() {
  const introDone = useGlobe((s) => s.introDone);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3600);
    return () => clearTimeout(t);
  }, []);

  const show = !introDone && !timedOut;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed top-[44%] left-1/2 z-[25] w-[min(90vw,900px)] -translate-x-1/2 -translate-y-1/2 text-center"
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.9 }}
        >
          <h2 className="font-display text-[clamp(40px,6vw,84px)] leading-none font-semibold tracking-tight text-white [text-shadow:0_4px_30px_rgba(10,30,50,.55)]">
            The world, <em className="font-medium">explained.</em>
          </h2>
          <p className="mt-3.5 text-[17px] text-white/90 [text-shadow:0_2px_12px_rgba(10,30,50,.6)]">
            Wars, alliances, money and power on one living globe.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
