"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { Marker } from "@/components/globe/Marker";
import { useNews } from "@/lib/api";
import { focus } from "@/lib/game/camera";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { useQuiz } from "@/lib/game/quiz/store";
import type { QuizCountry } from "@/lib/game/quiz/types";
import { loadCountries } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { Card } from "./Card";
import { Chapter } from "./Chapter";
import { End } from "./End";
import { Hud } from "./Hud";
import { Intro } from "./Intro";

/** Then · Now · Next: ten questions about the world, and the globe shows you where each answer happened. */
export function QuizGame() {
  const phase = useQuiz((s) => s.phase);
  const q = useQuiz((s) => s.questions[s.i]);
  const news = useNews({ limit: 100 });
  const [countries, setCountries] = useState<QuizCountry[] | null>(null);

  useEffect(() => {
    useQuiz.getState().hydrate();
    let alive = true;
    loadCountries()
      .then(
        (list) =>
          alive &&
          setCountries(
            list.map(({ iso3, name, centroid, area }) => ({
              iso3,
              name,
              centroid,
              area,
            })),
          ),
      )
      .catch(() => alive && setCountries([]));
    return () => {
      alive = false;
    };
  }, []);

  // the globe switches to game mode while this screen is mounted; taps on countries never open explore panels
  useEffect(() => {
    const g = useGlobe.getState();
    g.setPlay(true);
    g.select(null);
    g.setMode("home");
    const unsub = useGlobe.subscribe((s, prev) => {
      if (s.selectedIso3 && s.selectedIso3 !== prev.selectedIso3) setTimeout(() => useGlobe.getState().select(null), 0);
    });
    return () => {
      unsub();
      useGlobe.getState().setPlay(false);
    };
  }, []);

  // camera: the whole world at the door, a pull-back while you think (no spoilers), then a dive to the answer
  useEffect(() => {
    const wide = window.innerWidth >= 1024;
    if (phase === "intro") focus(20, wide ? 10 : 40, 4.9, 1600);
    else if (phase === "end") focus(20, 40, 5.4, 1800);
    else if (phase === "ask" && q) {
      const prev = useQuiz.getState().questions[useQuiz.getState().i - 1]?.place;
      focus((prev?.lat ?? 20) * 0.5, (prev?.lng ?? 30) + (wide ? 18 : 0), 5.2, 1400);
    } else if (phase === "reveal" && q) {
      // on phones the answer sheet is tall, so aim lower again to keep the pin in the strip of globe above it
      focus(q.place.lat - (window.innerWidth < 768 ? 9 : 0), q.place.lng + (wide ? 13 : 0), q.place.lat > 60 ? 3.6 : 3, 1700);
    }
  }, [phase, q]);

  // keyboard: 1–4 or A–D answer, F uses the 50:50, Enter moves on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      const s = useQuiz.getState();
      const k = e.key.toLowerCase();
      if (s.phase === "ask") {
        const n = Math.max("1234".indexOf(k), "abcd".indexOf(k));
        if (n >= 0 && !s.hidden.includes(n)) s.answer(n);
        else if (k === "f") s.fifty();
      } else if (s.phase === "reveal" && e.key === "Enter" && !(e.target as HTMLElement)?.closest("button,a")) s.next();
      else if (s.phase === "chapter" && e.key === "Enter") s.ask();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ready = countries !== null && !news.isLoading;
  const start = (daily: boolean) => useQuiz.getState().start(daily, news.data?.data ?? [], countries ?? []);
  const asOf = news.data?.asOf ? new Date(news.data.asOf) : null;
  const newsDate = asOf && !Number.isNaN(asOf.getTime()) ? asOf.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(48% 62% at 50% 52%, #d7e3ea 0%, rgba(215,227,234,.6) 45%, rgba(243,241,236,0) 75%), linear-gradient(180deg,#f6f4ef,#efede7)",
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(rgba(17,35,43,.07)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_70%_at_50%_50%,transparent_35%,#000_75%)]" />
      <GlobeClient variant="quiz">
        <AnswerMarker />
      </GlobeClient>
      <Intro onStart={start} ready={ready} newsDate={newsDate} />
      <Hud />
      <Chapter />
      <Card />
      <End onPractice={() => start(false)} />
    </main>
  );
}

/** Where the answer happened: a pulsing pin and a label, green when you got it right. */
function AnswerMarker() {
  const phase = useQuiz((s) => s.phase);
  const q = useQuiz((s) => s.questions[s.i]);
  const right = useQuiz((s) => s.answers[s.i]?.correct);
  if (phase !== "reveal" || !q) return null;
  const tone = right ? "#2fa36b" : "#e5484d";
  const Icon = ERA_LOOK[q.era].icon;
  return (
    <div className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      <Marker key={q.id} lat={q.place.lat} lng={q.place.lng} priority={10}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <span className="absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 opacity-60 motion-reduce:hidden" style={{ borderColor: tone, animationDuration: "2s" }} />
          <span className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ borderColor: tone, background: `${tone}22` }} />
          <span className="relative grid size-5 place-items-center rounded-full border-2 border-white text-white shadow-[0_0_14px_rgba(0,0,0,.25)]" style={{ background: tone }}>
            {right ? <Check className="size-3" strokeWidth={3.5} /> : <X className="size-3" strokeWidth={3.5} />}
          </span>
          <span className="absolute top-1/2 left-8 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-[var(--ink-strong)] py-1.5 pr-3.5 pl-2.5 text-[12.5px] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(17,35,43,.25)]">
            <Icon className="size-3.5" style={{ color: ERA_LOOK[q.era].color }} aria-hidden />
            {q.place.name}
            <span className="text-white/60">· {q.when}</span>
          </span>
        </div>
      </Marker>
    </div>
  );
}
