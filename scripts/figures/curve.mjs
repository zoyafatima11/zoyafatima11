import { PALETTES, SERIF, MONO, EM, irisGradient } from "../lib/palette.mjs";
import { esc, svg, rng, hash, r2, clamp, measure } from "../lib/util.mjs";

/** Wraps "a · b · c" at the separators, so no line starts or ends with a dot. */
function dotWrap(text, maxWidth) {
  const lines = [];
  for (const part of String(text).split(/\s*·\s*/)) {
    const last = lines[lines.length - 1];
    if (last && measure(`${last} · ${part}`, 13, EM.mono) <= maxWidth) lines[lines.length - 1] = `${last} · ${part}`;
    else lines.push(part);
  }
  return lines;
}

const W = 1200;
const H = 520;
const PLOT = { x0: 110, x1: 1150, y0: 70, y1: 400 };

/** Smooth-ish training loss: exponential decay plus noise that shrinks as training goes on. */
function lossCurve(rand, samples = 160) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const noise = (rand() - 0.5) * 0.07 * (1 - u * 0.8) + (rand() - 0.5) * 0.02;
    pts.push({ u, v: clamp(0.08 + 0.86 * Math.exp(-3.1 * u) + noise, 0.02, 0.98) });
  }
  // A light moving average keeps the shape readable without losing the "real run" jitter.
  return pts.map((pt, i) => {
    const win = pts.slice(Math.max(0, i - 2), i + 3);
    return { u: pt.u, v: win.reduce((s, q) => s + q.v, 0) / win.length };
  });
}

const toX = (u) => r2(PLOT.x0 + u * (PLOT.x1 - PLOT.x0));
const toY = (v) => r2(PLOT.y1 - v * (PLOT.y1 - PLOT.y0));
const path = (pts) => pts.map((q, i) => `${i ? "L" : "M"}${toX(q.u)} ${toY(q.v)}`).join(" ");
const lengthOf = (pts) =>
  pts.slice(1).reduce((s, q, i) => s + Math.hypot(toX(q.u) - toX(pts[i].u), toY(q.v) - toY(pts[i].v)), 0);

export function renderCurve(mode, cfg) {
  const p = PALETTES[mode];
  const r = cfg.roadmap;
  const [start, end] = [r.from, r.to];
  const uOf = (year) => clamp((year - start) / (end - start), 0, 1);
  const now = uOf(r.now);

  const curve = lossCurve(rng(hash(cfg.username + "loss")));
  const at = (u) => curve[Math.round(u * (curve.length - 1))].v;
  const observed = curve.filter((q) => q.u <= now + 1e-9);
  const projected = curve.filter((q) => q.u >= now - 1e-9);
  const obsLen = Math.ceil(lengthOf(observed)) + 2;

  // Axes, ticks, grid.
  const ticks = [];
  for (let y = Math.ceil(start); y <= end; y++) {
    const x = toX(uOf(y));
    ticks.push(`<line x1="${x}" y1="${PLOT.y0}" x2="${x}" y2="${PLOT.y1}" stroke="${p.faint}"/>
    <line x1="${x}" y1="${PLOT.y1}" x2="${x}" y2="${PLOT.y1 + 6}" stroke="${p.muted}"/>
    <text x="${x}" y="${PLOT.y1 + 26}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${p.muted}">${y}</text>`);
  }
  for (const v of [0.25, 0.5, 0.75]) {
    ticks.push(`<line x1="${PLOT.x0}" y1="${toY(v)}" x2="${PLOT.x1}" y2="${toY(v)}" stroke="${p.faint}" stroke-dasharray="2 6"/>`);
  }

  const nx = toX(now);
  const ny = toY(at(now));

  // Checkpoint labels: try a few spots (above the curve first, since a falling loss leaves
  // that side empty) and take the first that stays in the plot and clears everything placed so far.
  const taken = [
    { x0: W - 330, x1: W - 44, y0: PLOT.y0 - 18, y1: PLOT.y0 + 44 }, // legend
    { x0: nx, x1: nx + 130, y0: ny + 10, y1: ny + 32 }, // "you are here"
  ];
  // Reserve every checkpoint dot and the curve itself, so labels never sit on the line.
  for (const c of r.checkpoints) {
    const [x, y] = [toX(uOf(c.at)), toY(at(uOf(c.at)))];
    taken.push({ x0: x - 9, x1: x + 9, y0: y - 9, y1: y + 9 });
  }
  for (const q of curve.filter((_, i) => i % 3 === 0)) taken.push({ x0: toX(q.u) - 2, x1: toX(q.u) + 2, y0: toY(q.v) - 4, y1: toY(q.v) + 4 });
  const hits = (b) => taken.some((t) => b.x0 < t.x1 + 10 && b.x1 + 10 > t.x0 && b.y0 < t.y1 + 6 && b.y1 + 6 > t.y0);
  const cps = r.checkpoints.map((c, i) => {
    const u = uOf(c.at);
    const x = toX(u);
    const y = toY(at(u));
    const done = u <= now;
    const lines = dotWrap(c.detail, 200);
    const w = Math.max(measure(`ckpt-${i + 1}  `, 12, EM.mono) + measure(c.label, 18, EM.serifBold), ...lines.map((l) => measure(l, 13, EM.mono)));
    const lx = clamp(x - 12, PLOT.x0 + 8, PLOT.x1 - w);
    const h = 20 + lines.length * 18;
    const box = (ly) => ({ x0: lx, x1: lx + w, y0: ly - 16, y1: ly - 16 + h });
    const spots = [0, 1, 2, 3].map((k) => y - 30 - h - k * 50).concat([0, 1, 2, 3, 4].map((k) => y + 44 + k * 50));
    const ly = spots.find((ly) => ly - 16 >= PLOT.y0 - 10 && ly - 16 + h <= PLOT.y1 - 4 && !hits(box(ly))) ?? spots[0];
    taken.push(box(ly), { x0: x - 8, x1: x + 8, y0: y - 8, y1: y + 8 });
    const above = ly < y;
    const tag = `ckpt-${i + 1}`;
    return `<line x1="${x}" y1="${above ? y - 8 : y + 8}" x2="${x}" y2="${above ? ly - 16 + h + 4 : ly - 20}" stroke="${p.rule}" stroke-dasharray="3 3"/>
    <circle cx="${x}" cy="${y}" r="7" fill="${done ? p.iris[0] : p.bg}" stroke="${done ? p.iris[0] : p.muted}" stroke-width="2"/>
    <text x="${lx}" y="${ly}" font-family="${SERIF}" font-size="18" font-weight="700" fill="${p.ink}"><tspan font-family="${MONO}" font-size="12" font-weight="400" fill="${done ? p.accentText : p.muted}">${tag}  </tspan>${esc(c.label)}</text>
    ${lines.map((l, k) => `<text x="${lx}" y="${ly + 20 + k * 18}" font-family="${MONO}" font-size="13" fill="${p.muted}">${esc(l)}</text>`).join("\n    ")}`;
  });

  const css = `
    .draw { stroke-dasharray: ${obsLen}; animation: draw 3.2s cubic-bezier(.3,0,.2,1) both }
    @keyframes draw { from { stroke-dashoffset: ${obsLen} } to { stroke-dashoffset: 0 } }
    .ping { animation: ping 2.2s ease-out infinite; transform-origin: ${nx}px ${ny}px }
    @keyframes ping { from { transform: scale(1); opacity: .7 } to { transform: scale(3.2); opacity: 0 } }
    .march { animation: march 1.6s linear infinite }
    @keyframes march { to { stroke-dashoffset: -16 } }`;

  const defs = `${irisGradient(p)}
    <linearGradient id="under" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.iris[0]}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${p.iris[0]}" stop-opacity="0"/>
    </linearGradient>`;

  const area = `${path(observed)} L${toX(now)} ${PLOT.y1} L${PLOT.x0} ${PLOT.y1} Z`;
  const lx = W - 330;

  const body = `
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  ${ticks.join("\n  ")}
  <line x1="${PLOT.x0}" y1="${PLOT.y0 - 10}" x2="${PLOT.x0}" y2="${PLOT.y1}" stroke="${p.ink}" stroke-width="1.5"/>
  <line x1="${PLOT.x0}" y1="${PLOT.y1}" x2="${PLOT.x1}" y2="${PLOT.y1}" stroke="${p.ink}" stroke-width="1.5"/>
  <text transform="translate(66 ${(PLOT.y0 + PLOT.y1) / 2}) rotate(-90)" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="17" fill="${p.muted}">${esc(r.yLabel ?? "loss (confusion)")}</text>
  <text x="${PLOT.x1}" y="${PLOT.y1 + 52}" text-anchor="end" font-family="${SERIF}" font-style="italic" font-size="17" fill="${p.muted}">${esc(r.xLabel ?? "training time →")}</text>

  <path d="${area}" fill="url(#under)"/>
  <path d="${path(projected)}" fill="none" stroke="${p.muted}" stroke-width="2" stroke-dasharray="6 10" stroke-linecap="round" class="march"/>
  <path d="${path(observed)}" fill="none" stroke="url(#iris)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" class="draw"/>

  ${cps.join("\n  ")}

  <circle cx="${nx}" cy="${ny}" r="8" fill="${p.iris[2]}" class="ping"/>
  <circle cx="${nx}" cy="${ny}" r="6" fill="${p.iris[2]}" stroke="${p.bg}" stroke-width="2"/>
  <text x="${nx + 16}" y="${ny + 26}" font-family="${MONO}" font-size="13" font-weight="700" fill="${p.iris[2]}">◂ you are here</text>

  <!-- legend -->
  <rect x="${lx}" y="${PLOT.y0 - 18}" width="286" height="62" fill="${p.bg}" stroke="${p.rule}"/>
  <rect x="${lx + 16}" y="${PLOT.y0 + 2.25}" width="36" height="3.5" rx="1.75" fill="url(#iris)"/>
  <text x="${lx + 62}" y="${PLOT.y0 + 9}" font-family="${MONO}" font-size="13" fill="${p.ink}">observed</text>
  <line x1="${lx + 16}" y1="${PLOT.y0 + 28}" x2="${lx + 52}" y2="${PLOT.y0 + 28}" stroke="${p.muted}" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="${lx + 62}" y="${PLOT.y0 + 33}" font-family="${MONO}" font-size="13" fill="${p.ink}">projected</text>
  <circle cx="${lx + 180}" cy="${PLOT.y0 + 4}" r="5" fill="${p.iris[0]}"/>
  <text x="${lx + 192}" y="${PLOT.y0 + 9}" font-family="${MONO}" font-size="13" fill="${p.ink}">reached</text>
  <circle cx="${lx + 180}" cy="${PLOT.y0 + 28}" r="5" fill="${p.bg}" stroke="${p.muted}" stroke-width="2"/>
  <text x="${lx + 192}" y="${PLOT.y0 + 33}" font-family="${MONO}" font-size="13" fill="${p.ink}">next</text>

  <rect x="44" y="${H - 58}" width="${W - 88}" height="0.75" fill="${p.rule}"/>
  <text x="44" y="${H - 26}" font-family="${SERIF}" font-size="17" fill="${p.muted}"><tspan font-weight="700" fill="${p.ink}">Figure 2.</tspan> <tspan font-style="italic">${esc(r.caption ?? "Training run, with checkpoints.")}</tspan></text>`;

  return svg({
    w: W,
    h: H,
    title: "Figure 2: learning roadmap as a training-loss curve",
    desc: `Roadmap from ${start} to ${end}. Checkpoints: ${r.checkpoints.map((c) => `${c.label} (${c.at}): ${c.detail}`).join("; ")}.`,
    css,
    defs,
    body,
  });
}
