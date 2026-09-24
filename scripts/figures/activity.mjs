import { PALETTES, SERIF, MONO, irisGradient } from "../lib/palette.mjs";
import { svg, r2 } from "../lib/util.mjs";

const W = 1200;
const H = 300;
const PLOT = { x0: 60, x1: 1140, y0: 50, y1: 210 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Figure 3: weekly contributions over the last year, drawn like a training log.
 * `weeks` is [{ start: "YYYY-MM-DD", count }], oldest first.
 */
export function renderActivity(mode, weeks) {
  const p = PALETTES[mode];
  const n = weeks.length;
  const total = weeks.reduce((s, w) => s + w.count, 0);
  const max = Math.max(...weeks.map((w) => w.count), 1);
  const x = (i) => r2(PLOT.x0 + (i / Math.max(n - 1, 1)) * (PLOT.x1 - PLOT.x0));
  const y = (c) => r2(PLOT.y1 - (Math.sqrt(c) / Math.sqrt(max)) * (PLOT.y1 - PLOT.y0));

  // Catmull-Rom → cubic Bézier for a smooth line through the weekly points.
  const pts = weeks.map((w, i) => [x(i), y(w.count)]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    const c1 = [r2(p1[0] + (p2[0] - p0[0]) / 6), r2(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [r2(p2[0] - (p3[0] - p1[0]) / 6), r2(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1.join(" ")} ${c2.join(" ")} ${p2.join(" ")}`;
  }
  const area = `${d} L${PLOT.x1} ${PLOT.y1} L${PLOT.x0} ${PLOT.y1} Z`;

  const labels = [];
  let last = -1;
  weeks.forEach((w, i) => {
    const m = new Date(`${w.start}T00:00:00Z`).getUTCMonth();
    if (m !== last && i > 0) {
      labels.push(`<text x="${x(i)}" y="${PLOT.y1 + 24}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${p.muted}">${MONTHS[m]}</text>`);
    }
    last = m;
  });

  const peak = weeks.reduce((b, w, i) => (w.count > weeks[b].count ? i : b), 0);
  const empty = total === 0;

  const body = `
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <text x="${PLOT.x0}" y="30" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${p.muted}">CONTRIBUTIONS / WEEK · LAST ${n} WEEKS</text>
  <text x="${PLOT.x1}" y="30" text-anchor="end" font-family="${MONO}" font-size="13" fill="${p.accentText}">Σ ${total} steps</text>
  <line x1="${PLOT.x0}" y1="${PLOT.y1}" x2="${PLOT.x1}" y2="${PLOT.y1}" stroke="${p.ink}" stroke-width="1.2"/>
  ${labels.join("\n  ")}
  ${
    empty
      ? `<text x="${W / 2}" y="${(PLOT.y0 + PLOT.y1) / 2 + 20}" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="22" fill="${p.muted}">warming up: the first steps of this run are about to be logged</text>
  <rect x="${PLOT.x0}" y="${PLOT.y1 - 2}" width="80" height="3" fill="url(#iris)" class="scan"/>`
      : `<path d="${area}" fill="url(#under)"/>
  <path d="${d}" fill="none" stroke="url(#iris)" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="${pts[peak][0]}" cy="${pts[peak][1]}" r="5" fill="${p.iris[2]}"/>
  <text x="${pts[peak][0]}" y="${pts[peak][1] - 12}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${p.iris[2]}">peak ${weeks[peak].count}</text>`
  }
  <rect x="44" y="${H - 50}" width="${W - 88}" height="0.75" fill="${p.rule}"/>
  <text x="44" y="${H - 20}" font-family="${SERIF}" font-size="17" fill="${p.muted}"><tspan font-weight="700" fill="${p.ink}">Figure 3.</tspan> <tspan font-style="italic">Training log: GitHub contributions per week, refreshed daily.</tspan></text>`;

  return svg({
    w: W,
    h: H,
    title: "Figure 3: GitHub contributions per week",
    desc: empty ? "No contributions logged yet." : `${total} contributions over the last ${n} weeks; the busiest week had ${weeks[peak].count}.`,
    css: `.scan { animation: scan 3s ease-in-out infinite alternate } @keyframes scan { to { transform: translateX(${PLOT.x1 - PLOT.x0 - 80}px) } }`,
    defs: `${irisGradient(p)}
    <linearGradient id="under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.iris[1]}" stop-opacity="0.3"/><stop offset="1" stop-color="${p.iris[1]}" stop-opacity="0"/></linearGradient>`,
    body,
  });
}
