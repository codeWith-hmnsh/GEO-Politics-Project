"use client";

import { useEffect } from "react";
import { usePulse } from "@/lib/api";
import { useGlobe } from "@/lib/store";
import { termById, useSeeOnGlobe } from "./Term";

/** `/?term=nato` (from the Glossary page): show that term on the globe once the intro has ended. */
export function TermFromUrl() {
  const introDone = useGlobe((s) => s.introDone);
  const { data } = usePulse();
  const see = useSeeOnGlobe();
  useEffect(() => {
    if (!introDone || !data) return;
    const id = new URLSearchParams(window.location.search).get("term");
    const t = id ? termById(id) : undefined;
    if (!t) return;
    see(t);
    window.history.replaceState(null, "", window.location.pathname);
  }, [introDone, data, see]);
  return null;
}
