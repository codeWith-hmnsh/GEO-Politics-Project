// Tiny synthesized interface sounds (UI-DESIGN §6.4). On by default at low volume; the choice is remembered.
let ctx: AudioContext | null = null;
let muted = false;
if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem("statecraft-muted") === "1";
  } catch {
    muted = false;
  }
}

function tone(freqs: number[], { dur = 0.12, type = "sine" as OscillatorType, vol = 0.05, gap = 0.06 } = {}) {
  if (muted || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = ctx!.currentTime + i * gap;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch {
    // audio is optional
  }
}

export const sound = {
  click: () => tone([660], { dur: 0.05, type: "triangle", vol: 0.03 }),
  place: () => tone([520, 780], { dur: 0.09, type: "triangle", vol: 0.035 }),
  lock: () => tone([180, 120], { dur: 0.18, type: "square", vol: 0.025, gap: 0.05 }),
  chime: () => tone([784, 988, 1319], { dur: 0.35, vol: 0.035, gap: 0.08 }),
  knock: () => tone([300, 300], { dur: 0.07, type: "triangle", vol: 0.04, gap: 0.12 }),
  rank: () => tone([523, 659, 784, 1047], { dur: 0.3, vol: 0.04, gap: 0.07 }),
  flip: () => tone([400], { dur: 0.06, type: "triangle", vol: 0.025 }),
  isMuted: () => muted,
  setMuted: (v: boolean) => {
    muted = v;
    try {
      localStorage.setItem("statecraft-muted", v ? "1" : "0");
    } catch {
      // storage is optional
    }
  },
};
