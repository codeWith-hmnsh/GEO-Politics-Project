"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import BlurText from "@/components/bits/BlurText";
import { prefersReducedMotion } from "@/components/globe/shared";
import { track } from "@/lib/analytics";
import { timeAgo, useNews, usePulse } from "@/lib/api";
import { useGlobe } from "@/lib/store";
import { matchesTour, stopSeconds, tourById, type Tour } from "@/lib/tours";

/** Final stop: "What's happening now" with live headlines that match the tour (CONTENT-GUIDE §5.1). */
function LiveStop({ tour }: { tour: Tour }) {
  const { data } = useNews({ section: tour.live_query.section, limit: 60 });
  const items = matchesTour(data?.data ?? [], tour.live_query.terms).slice(0, 3);
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[.16em] text-white/60 uppercase">What&apos;s happening now</div>
      {items.length ? (
        <ul className="mt-2 grid gap-2">
          {items.map((n) => (
            <li key={n.id} className="text-[14px] leading-snug">
              <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                {n.title}
                <ExternalLink className="ml-1 inline size-3 align-baseline opacity-70" aria-hidden />
              </a>
              <span className="block text-xs text-white/60">
                {n.source} · {timeAgo(n.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/80">No new headlines on this from trusted outlets in the last 48 hours.</p>
      )}
    </div>
  );
}

/** Story Tour player: fly to each stop, orbit slowly, light up the countries, then end on live news (PRD §6). */
export function StoryPlayer() {
  const state = useGlobe((s) => s.tour);
  const { data: pulse } = usePulse();
  const tour = state ? tourById(state.id) : undefined;
  const step = state?.step ?? 0;
  const playing = state?.playing ?? false;
  const stop = tour?.stops[step];
  const live = !!tour && step >= tour.stops.length;
  const [reduce] = useState(prefersReducedMotion);

  // Camera, highlight and orbit for the current stop.
  useEffect(() => {
    if (!tour) return;
    const g = useGlobe.getState();
    g.setOrbit(0);
    if (!stop) {
      g.setHighlight([]);
      return;
    }
    const members = stop.highlight_org ? (pulse?.data.organizations.find((o) => o.id === stop.highlight_org)?.members ?? []) : (stop.highlight ?? []);
    useGlobe.setState({ highlight: members });
    // Never closer than 1.75 R: tours stay at the "country" scale, above state names and tilt.
    g.flyTo({ lat: stop.camera.lat, lng: stop.camera.lng, dist: Math.max(1.75, 1 + stop.camera.altitude), durationMs: 2200 });
    if (!playing || reduce) return;
    const id = setTimeout(() => useGlobe.getState().setOrbit(stop.orbit_deg / stopSeconds(stop.caption)), 2300);
    return () => clearTimeout(id);
  }, [tour, stop, playing, pulse, reduce]);

  useEffect(() => {
    if (!tour) return;
    if (step === 0) track("tour_start", { tour: tour.id });
    else if (live) track("tour_complete", { tour: tour.id });
    else track("tour_step", { tour: tour.id, step });
  }, [tour, step, live]);

  // Keyboard: Space plays or pauses, arrows move between stops, Escape ends the tour.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      const g = useGlobe.getState();
      const s = g.tour;
      if (!s) return;
      if (e.key === "Escape") g.endTour();
      else if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        g.setTour({ playing: !s.playing });
      } else if (e.key === "ArrowRight") g.setTour({ step: Math.min(tour.stops.length, s.step + 1) });
      else if (e.key === "ArrowLeft") g.setTour({ step: Math.max(0, s.step - 1) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour]);

  if (!tour || !state) return null;
  const go = (n: number) => useGlobe.getState().setTour({ step: Math.max(0, Math.min(tour.stops.length, n)) });
  const toggle = () => {
    useGlobe.getState().setTour({ playing: !playing });
    if (playing) useGlobe.getState().setOrbit(0);
  };
  const total = tour.stops.length + 1;

  return (
    <section
      aria-label={`Story: ${tour.title}`}
      className="fixed inset-x-0 bottom-[22px] z-40 mx-auto w-[min(640px,calc(100%-24px))] overflow-hidden rounded-[20px] bg-[var(--night)]/92 text-white shadow-[0_18px_50px_rgba(0,0,0,.4)] backdrop-blur-xl"
    >
      {!live && stop && (
        <div className="h-[3px] bg-white/15">
          <div
            key={`${tour.id}-${step}`}
            className="h-full origin-left bg-white [animation:tour-progress_linear_forwards]"
            style={{ animationDuration: `${stopSeconds(stop.caption)}s`, animationPlayState: playing ? "running" : "paused" }}
            onAnimationEnd={() => go(step + 1)}
          />
        </div>
      )}
      <div className="p-5 pb-4 max-md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-bold tracking-[.16em] text-white/60 uppercase">
            Story · {tour.title}
          </div>
          <button
            type="button"
            aria-label="End story"
            onClick={() => useGlobe.getState().endTour()}
            className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/10"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div aria-live="polite" className="mt-1.5 min-h-[92px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {live ? (
                <LiveStop tour={tour} />
              ) : stop ? (
                <>
                  <h2 className="font-display text-[26px] leading-tight font-semibold">{stop.caption_title}</h2>
                  {reduce ? (
                    <p className="mt-1.5 text-[15px] leading-relaxed text-white/85">{stop.caption}</p>
                  ) : (
                    <BlurText key={stop.caption} text={stop.caption} delay={45} animateBy="words" direction="bottom" className="mt-1.5 text-[15px] leading-relaxed text-white/85" />
                  )}
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" aria-label="Previous stop" disabled={step === 0} onClick={() => go(step - 1)} className="grid size-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-35">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            disabled={live}
            className="grid size-10 place-items-center rounded-full bg-white text-[var(--night)] disabled:opacity-35"
          >
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
          </button>
          <button type="button" aria-label="Next stop" disabled={live} onClick={() => go(step + 1)} className="grid size-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-35">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <ol aria-label="Stops" className="ml-2 flex flex-1 items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-label={i === total - 1 ? "What's happening now" : `Stop ${i + 1}: ${tour.stops[i].caption_title}`}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => go(i)}
                  className={`block h-2 rounded-full transition-all ${i === step ? "w-6 bg-white" : i < step ? "w-2 bg-white/70" : "w-2 bg-white/30"}`}
                />
              </li>
            ))}
          </ol>
          <span className="text-[11px] text-white/50 max-md:hidden">Reviewed {tour.reviewed}</span>
        </div>
      </div>
    </section>
  );
}
