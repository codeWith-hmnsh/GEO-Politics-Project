// Simplified, neutral bloc glyphs (never official logos — UI-DESIGN §3.4).

function star(cx: number, cy: number, r: number) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    d += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

const Text = ({ t, size = 9.5 }: { t: string; size?: number }) => (
  <text x="13" y="16.5" fontSize={size} fontWeight={700} fill="#fff" textAnchor="middle" fontFamily="var(--font-sans), sans-serif">
    {t}
  </text>
);

export function Emblem({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 26 26" className={className} aria-hidden>
      {id === "NATO" && (
        <>
          <circle cx="13" cy="13" r="9.5" fill="none" stroke="#fff" strokeWidth="1" />
          <path d="M13 2 15 11 24 13 15 15 13 24 11 15 2 13 11 11Z" fill="#fff" />
          <path d="M13 13 15 11 13 2Z M13 13 15 15 24 13Z" fill="#9FC0F0" />
        </>
      )}
      {id === "EU" &&
        Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <path key={i} d={star(13 + 8.5 * Math.cos(a), 13 + 8.5 * Math.sin(a), 2.1)} fill="#FFD34D" />;
        })}
      {id === "BRICS" &&
        ["#009C3B", "#D52B1E", "#FF9933", "#EE1C25", "#FFB612"].map((c, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          return <circle key={c} cx={13 + 7 * Math.cos(a)} cy={13 + 7 * Math.sin(a)} r="3.6" fill={c} stroke="#fff" strokeWidth=".8" />;
        })}
      {id === "QUAD" &&
        [
          [13, 6],
          [20, 13],
          [13, 20],
          [6, 13],
        ].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y - 4} ${x + 4} ${y} ${x} ${y + 4} ${x - 4} ${y}Z`} fill="#fff" opacity=".92" />)}
      {id === "ASEAN" && (
        <>
          <circle cx="13" cy="13" r="10" fill="#D7263D" />
          <circle cx="13" cy="13" r="7" fill="#F5C518" />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M${(9.4 + i * 0.8).toFixed(1)} 17 ${(10.5 + i * 0.6).toFixed(1)} 8`} stroke="#8A5A00" strokeWidth=".7" />
          ))}
        </>
      )}
      {id === "SCO" && (
        <>
          <circle cx="13" cy="13" r="10" fill="none" stroke="#fff" strokeWidth="1" />
          <Text t="SCO" size={8.5} />
        </>
      )}
      {id === "G7" && <Text t="G7" size={10} />}
      {id === "G20" && <Text t="G20" />}
    </svg>
  );
}

export function Medal({ id, size = 44 }: { id: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full border-2 border-white/90 shadow-[0_6px_16px_rgba(10,30,60,.45),0_0_0_4px_rgba(255,255,255,.18)]"
      style={{ width: size, height: size, background: "radial-gradient(circle at 35% 30%, #2a5a9a, #102c55 70%)" }}
    >
      <Emblem id={id} className="size-[60%]" />
    </span>
  );
}
