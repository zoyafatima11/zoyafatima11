import { PALETTES, SERIF, MONO, EM, irisAt, irisGradient } from "../lib/palette.mjs";
import { esc, svg, rng, hash, r2, measure, chars } from "../lib/util.mjs";

const W = 1200;
const H = 540;

// Figure 0 panel and the shape the noise resolves into.
const FIG = { x: 736, y: 84, w: 420, h: 372 };
const CX = FIG.x + FIG.w / 2;
const CY = FIG.y + FIG.h / 2 - 4;
const R = 150;
const N = 260;
const CYCLE = 10; // seconds for noise → shape → noise
const COUNTER_X = FIG.x + FIG.w - 4 * 15 * EM.mono; // room for "1000"

// Denoising steps shown under the figure, with the share of the cycle each one is on screen.
const STEPS = [
  ["1000", 0, 12],
  ["750", 12, 24],
  ["500", 24, 36],
  ["250", 36, 48],
  ["0", 48, 84],
  ["1000", 84, 100],
];

/** A rose curve r = cos(kθ), plus a faint halo ring, sampled evenly along θ. */
function targets(petals) {
  const k = petals % 2 === 0 ? petals / 2 : petals;
  const pts = [];
  const ring = Math.round(N * 0.18);
  for (let i = 0; i < N - ring; i++) {
    const th = (i / (N - ring)) * Math.PI * 2;
    const r = R * Math.cos(k * th);
    pts.push({ x: CX + r * Math.cos(th), y: CY + r * Math.sin(th), t: Math.abs(Math.cos(k * th)), halo: false });
  }
  for (let i = 0; i < ring; i++) {
    const th = (i / ring) * Math.PI * 2;
    pts.push({ x: CX + (R + 22) * Math.cos(th), y: CY + (R + 22) * Math.sin(th), t: i / ring, halo: true });
  }
  return pts;
}

export function renderTitle(mode, cfg) {
  const p = PALETTES[mode];
  const rand = rng(hash(cfg.username));
  const t = cfg.title ?? {};
  const name = cfg.name;

  const dots = targets(t.petals ?? 8)
    .map((pt) => {
      const nx = CX + rand.gauss() * 88;
      const ny = CY + rand.gauss() * 88;
      const dx = r2(Math.max(FIG.x + 8, Math.min(FIG.x + FIG.w - 8, nx)) - pt.x);
      const dy = r2(Math.max(FIG.y + 8, Math.min(FIG.y + FIG.h - 8, ny)) - pt.y);
      const size = pt.halo ? 1.6 : r2(1.9 + pt.t * 1.8);
      const color = irisAt(p, pt.halo ? pt.t : 1 - pt.t);
      const delay = r2(rand() * 0.9);
      return `<circle cx="${r2(pt.x)}" cy="${r2(pt.y)}" r="${size}" fill="${color}"${pt.halo ? ` opacity="0.45"` : ""} style="--dx:${dx}px;--dy:${dy}px;animation-delay:-${delay}s"/>`;
    })
    .join("\n      ");

  const steps = STEPS.map(([label, from, to], i) => {
    const kf = `${from === 0 ? "" : `0%, ${from - 0.01}% { opacity: 0 } `}${from}% { opacity: 1 } ${to - 0.01}% { opacity: 1 }${to === 100 ? "" : ` ${to}%, 100% { opacity: 0 }`}`;
    const isFinal = label === "0";
    return {
      css: `@keyframes s${i} { ${kf} } .s${i} { animation: s${i} ${CYCLE}s linear infinite }`,
      // Separate <text> elements: hidden tspans would still take up width.
      svg: `<text x="${COUNTER_X}" y="${FIG.y + FIG.h + 30}" class="s${i}"${isFinal ? "" : ` opacity="0"`} font-family="${MONO}" font-size="15" fill="${p.accentText}">${label}</text>`,
    };
  });

  // Title block, left column.
  const nameSize = Math.min(82, Math.floor(560 / (Math.max(chars(name), 1) * EM.serifBold)));
  const subtitle = t.subtitle ?? "";
  const subSize = Math.min(28, Math.floor(560 / (Math.max(chars(subtitle), 1) * EM.serifItalic)));
  const keywords = (t.keywords ?? []).join("  ·  ");
  const kwSize = Math.min(19, Math.floor(470 / (Math.max(chars(keywords), 1) * EM.serifItalic)));
  const stamp = t.stamp ?? `profile:${cfg.username} v1 [cs.AI]`;
  const stampW = measure(stamp, 15, EM.mono);

  const css = `
    .dot circle { animation: denoise ${CYCLE}s cubic-bezier(.45,0,.2,1) infinite }
    @keyframes denoise {
      0%, 8% { transform: translate(var(--dx), var(--dy)); opacity: .55 }
      50%, 82% { transform: translate(0px, 0px); opacity: 1 }
      100% { transform: translate(var(--dx), var(--dy)); opacity: .55 }
    }
    .spin { animation: spin 60s linear infinite; transform-origin: ${CX}px ${CY}px }
    @keyframes spin { to { transform: rotate(360deg) } }
    ${steps.map((s) => s.css).join("\n    ")}
    .blink { animation: blink 1.2s steps(1, end) infinite }
    @keyframes blink { 50% { opacity: 0 } }`;

  const defs = `
    ${irisGradient(p)}
    <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.6" fill="${p.faint}"/>
    </pattern>
    <clipPath id="fig"><rect x="${FIG.x}" y="${FIG.y}" width="${FIG.w}" height="${FIG.h}"/></clipPath>`;

  const body = `
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#grain)" opacity="0.6"/>

  <!-- running header -->
  <text x="100" y="46" font-family="${MONO}" font-size="13" letter-spacing="2.5" fill="${p.muted}">${esc((t.header ?? "PREPRINT").toUpperCase())}</text>
  <text x="${W - 44}" y="46" text-anchor="end" font-family="${MONO}" font-size="13" letter-spacing="1" fill="${p.muted}">github.com/${esc(cfg.username)}</text>
  <rect x="100" y="60" width="${W - 144}" height="1.5" fill="${p.ink}"/>
  <rect x="100" y="64" width="${W - 144}" height="0.75" fill="${p.ink}"/>

  <!-- arXiv-style side stamp -->
  <text transform="translate(58 ${r2(H / 2 + stampW / 2)}) rotate(-90)" font-family="${MONO}" font-size="15" letter-spacing="1" fill="${p.muted}" opacity="0.75">${esc(stamp)}</text>

  <!-- title block -->
  <text x="100" y="150" font-family="${MONO}" font-size="14" letter-spacing="3" fill="${p.accentText}">${esc((t.kicker ?? "").toUpperCase())}</text>
  <text x="96" y="${r2(160 + nameSize * 0.86)}" font-family="${SERIF}" font-size="${nameSize}" font-weight="700" letter-spacing="-1.5" fill="${p.ink}">${esc(name)}</text>
  <rect x="100" y="${r2(160 + nameSize * 0.86 + 22)}" width="120" height="4" fill="url(#iris)"/>
  <text x="100" y="${r2(160 + nameSize * 0.86 + 70)}" font-family="${SERIF}" font-style="italic" font-size="${subSize}" fill="${p.ink}">${esc(subtitle)}</text>
  ${keywords ? `<text x="100" y="${r2(160 + nameSize * 0.86 + 122)}" font-family="${SERIF}" font-size="${kwSize}" fill="${p.muted}"><tspan font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${p.accentText}">KEYWORDS  </tspan><tspan font-style="italic">${esc(keywords)}</tspan></text>` : ""}

  <!-- status line -->
  <rect x="100" y="${H - 104}" width="560" height="0.75" fill="${p.rule}"/>
  <text x="100" y="${H - 72}" font-family="${MONO}" font-size="14" fill="${p.muted}"><tspan fill="${p.accentText}">▸</tspan> status: <tspan fill="${p.ink}">${esc(t.status ?? "")}</tspan><tspan class="blink" fill="${p.accentText}">▍</tspan></text>
  <text x="100" y="${H - 46}" font-family="${MONO}" font-size="14" fill="${p.muted}"><tspan fill="${p.accentText}">▸</tspan> seeking: <tspan fill="${p.ink}">${esc(t.seeking ?? "")}</tspan></text>

  <!-- Figure 0 -->
  <rect x="${FIG.x}" y="${FIG.y}" width="${FIG.w}" height="${FIG.h}" fill="${p.inset}" stroke="${p.rule}"/>
  <g clip-path="url(#fig)">
    <g class="spin"><g class="dot">
      ${dots}
    </g></g>
  </g>
  <text x="${FIG.x}" y="${FIG.y + FIG.h + 30}" font-family="${SERIF}" font-size="16" fill="${p.muted}"><tspan font-weight="700" fill="${p.ink}">Figure 0.</tspan> <tspan font-style="italic">Reverse diffusion, noise → structure.</tspan></text>
  <text x="${COUNTER_X - 8}" y="${FIG.y + FIG.h + 30}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${p.accentText}">t =</text>
  ${steps.map((s) => s.svg).join("\n  ")}
  <text x="${FIG.x + FIG.w}" y="${FIG.y + FIG.h + 54}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${p.muted}" opacity="0.8">${N} samples · seed ${hash(cfg.username) % 10000}</text>`;

  return svg({
    w: W,
    h: H,
    title: `${name}: ${subtitle}`,
    desc: `A research-paper title page for ${name}. Keywords: ${keywords}. Figure 0 animates random noise resolving into a flower-shaped curve, like a diffusion model denoising.`,
    css,
    defs,
    body,
  });
}
