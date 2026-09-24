import { PALETTES, SERIF, MONO, EM, irisAt } from "../lib/palette.mjs";
import { esc, svg, rng, hash, r2, measure, chars } from "../lib/util.mjs";
import { W, M, frame, paper, baseDefs, runningHead, doubleRule } from "../lib/sheet.mjs";

const H = 560;

// Figure 0: noise that resolves into a rose curve, like a diffusion model denoising.
const FIG = { x: 724, y: 124, w: 412, h: 348 };
const CX = FIG.x + FIG.w / 2;
const CY = FIG.y + FIG.h / 2;
const R = 140;
const N = 260;
const CYCLE = 10;
const COUNTER_X = FIG.x + FIG.w - 4 * 15 * EM.mono;

// Diffusion timestep shown under the figure: [label, visible from %, to %] of the cycle.
const STEPS = [
  ["1000", 0, 12],
  ["750", 12, 24],
  ["500", 24, 36],
  ["250", 36, 48],
  ["0", 48, 84],
  ["1000", 84, 100],
];

function targets(petals) {
  const k = petals % 2 === 0 ? petals / 2 : petals;
  const ring = Math.round(N * 0.18);
  const pts = [];
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

export function renderTitle(mode, cfg, page) {
  const p = PALETTES[mode];
  const t = cfg.title;
  const rand = rng(hash(cfg.username));

  const dots = targets(t.petals ?? 8)
    .map((pt) => {
      const nx = Math.max(FIG.x + 8, Math.min(FIG.x + FIG.w - 8, CX + rand.gauss() * 88));
      const ny = Math.max(FIG.y + 8, Math.min(FIG.y + FIG.h - 8, CY + rand.gauss() * 88));
      const size = pt.halo ? 1.6 : r2(1.9 + pt.t * 1.8);
      const color = irisAt(p, pt.halo ? pt.t : 1 - pt.t);
      return `<circle cx="${r2(pt.x)}" cy="${r2(pt.y)}" r="${size}" fill="${color}"${pt.halo ? ` opacity="0.45"` : ""} style="--dx:${r2(nx - pt.x)}px;--dy:${r2(ny - pt.y)}px;animation-delay:-${r2(rand() * 0.9)}s"/>`;
    })
    .join("\n      ");

  const steps = STEPS.map(([label, from, to], i) => ({
    css: `@keyframes s${i} { ${from === 0 ? "" : `0%, ${from - 0.01}% { opacity: 0 } `}${from}% { opacity: 1 } ${to - 0.01}% { opacity: 1 }${to === 100 ? "" : ` ${to}%, 100% { opacity: 0 }`} } .s${i} { animation: s${i} ${CYCLE}s linear infinite }`,
    svg: `<text x="${r2(COUNTER_X)}" y="${FIG.y + FIG.h + 30}" class="s${i}"${label === "0" ? "" : ` opacity="0"`} font-family="${MONO}" font-size="15" fill="${p.accentText}">${label}</text>`,
  }));

  const name = cfg.name;
  const nameSize = Math.min(86, Math.floor(560 / (Math.max(chars(name), 1) * EM.serifBold)));
  const subtitle = t.subtitle ?? "";
  const subSize = Math.min(28, Math.floor(560 / (Math.max(chars(subtitle), 1) * EM.serifItalic)));
  const keywords = (t.keywords ?? []).join("  ·  ");
  const kwSize = Math.min(18, Math.floor(480 / (Math.max(chars(keywords), 1) * EM.serifItalic)));
  const stamp = t.stamp ?? `profile:${cfg.username} [cs.AI]`;
  const nameY = 188 + nameSize * 0.8;

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

  const body = `
  ${paper(p, W, H)}
  <text x="${M}" y="70" font-family="${MONO}" font-size="12.5" letter-spacing="3" fill="${p.muted}">${esc((t.header ?? "PREPRINT").toUpperCase())}</text>
  ${runningHead(p, cfg, page, 70)}
  ${doubleRule(p, 92)}

  <text transform="translate(38 ${r2(H / 2 + measure(stamp, 13, EM.mono) / 2)}) rotate(-90)" font-family="${MONO}" font-size="13" letter-spacing="1" fill="${p.muted}" opacity="0.7">${esc(stamp)}</text>

  <text x="${M}" y="176" font-family="${MONO}" font-size="13.5" letter-spacing="3" fill="${p.accentText}">${esc((t.kicker ?? "").toUpperCase())}</text>
  <text x="${M - 4}" y="${r2(nameY)}" font-family="${SERIF}" font-size="${nameSize}" font-weight="700" letter-spacing="-1.5" fill="${p.ink}">${esc(name)}</text>
  <rect x="${M}" y="${r2(nameY + 22)}" width="120" height="4" fill="url(#iris)"/>
  <text x="${M}" y="${r2(nameY + 70)}" font-family="${SERIF}" font-style="italic" font-size="${subSize}" fill="${p.ink}">${esc(subtitle)}</text>
  <text x="${M}" y="${r2(nameY + 118)}" font-family="${SERIF}" font-size="${kwSize}" fill="${p.muted}"><tspan font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${p.accentText}">KEYWORDS  </tspan><tspan font-style="italic">${esc(keywords)}</tspan></text>

  <rect x="${M}" y="${H - 118}" width="580" height="0.75" fill="${p.rule}"/>
  <text x="${M}" y="${H - 84}" font-family="${MONO}" font-size="14" fill="${p.muted}"><tspan fill="${p.accentText}">▸</tspan> status   <tspan fill="${p.ink}">${esc(t.status ?? "")}</tspan><tspan class="blink" fill="${p.accentText}">▍</tspan></text>
  <text x="${M}" y="${H - 58}" font-family="${MONO}" font-size="14" fill="${p.muted}"><tspan fill="${p.accentText}">▸</tspan> seeking  <tspan fill="${p.ink}">${esc(t.seeking ?? "")}</tspan></text>

  <rect x="${FIG.x}" y="${FIG.y}" width="${FIG.w}" height="${FIG.h}" fill="${p.inset}" stroke="${p.rule}"/>
  <g clip-path="url(#fig)"><g class="spin"><g class="dot">
      ${dots}
  </g></g></g>
  <text x="${FIG.x}" y="${FIG.y + FIG.h + 30}" font-family="${SERIF}" font-size="16" fill="${p.muted}"><tspan font-weight="700" fill="${p.ink}">Figure 0.</tspan> <tspan font-style="italic">Reverse diffusion, noise → structure.</tspan></text>
  <text x="${r2(COUNTER_X - 8)}" y="${FIG.y + FIG.h + 30}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${p.accentText}">t =</text>
  ${steps.map((s) => s.svg).join("\n  ")}
  <text x="${FIG.x + FIG.w}" y="${FIG.y + FIG.h + 54}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${p.muted}" opacity="0.8">${N} samples · seed ${hash(cfg.username) % 10000}</text>
  ${frame(p, W, H)}`;

  return svg({
    w: W,
    h: H,
    title: `${name}: ${subtitle}`,
    desc: `Title page of a research-paper style profile for ${name}. Keywords: ${keywords}. Figure 0 animates random noise resolving into a flower-shaped curve, like a diffusion model denoising.`,
    css,
    defs: `${baseDefs(p)}
    <clipPath id="fig"><rect x="${FIG.x}" y="${FIG.y}" width="${FIG.w}" height="${FIG.h}"/></clipPath>`,
    body,
  });
}
