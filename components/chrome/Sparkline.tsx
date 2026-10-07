/** Small trend line (docs/UI-DESIGN.md §6). Projections after `lastActual` are drawn dashed. */
export function Sparkline({
  points,
  lastActual,
  color = "#c8891a",
  width = 88,
  height = 28,
  label,
}: {
  points: [number, number][];
  lastActual?: number;
  color?: string;
  width?: number;
  height?: number;
  label: string;
}) {
  if (points.length < 2) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const px = (x: number) => 2 + ((x - x0) / (x1 - x0 || 1)) * (width - 6);
  const py = (y: number) => height - 3 - ((y - y0) / (y1 - y0 || 1)) * (height - 8);
  const actual = lastActual === undefined ? points : points.filter((p) => p[0] <= lastActual);
  const projected = lastActual === undefined ? [] : points.filter((p) => p[0] >= lastActual);
  const line = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join("");
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0">
      {actual.length > 1 && <path d={line(actual)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />}
      {projected.length > 1 && <path d={line(projected)} fill="none" stroke={color} strokeWidth={1.6} strokeDasharray="3 3" />}
      <circle cx={px(last[0])} cy={py(last[1])} r={3} fill="var(--ink-strong)" />
    </svg>
  );
}
