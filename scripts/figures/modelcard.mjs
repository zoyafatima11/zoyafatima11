import { PALETTES, SERIF, MONO, EM, irisGradient } from "../lib/palette.mjs";
import { esc, svg, r2, wrap, clamp } from "../lib/util.mjs";

const W = 1200;
const PAD = 44;
const KEY_W = 250;
const VAL_X = PAD + KEY_W + 24;
const VAL_W = W - VAL_X - PAD;
const LINE = 26;

/** Table 1: a model card in booktabs style (thick top/bottom rules, thin midrule, no verticals). */
export function renderModelCard(mode, cfg) {
  const p = PALETTES[mode];
  const card = cfg.modelCard;

  let y = 110; // first row baseline
  const rows = card.rows.map(([key, value], i) => {
    const lines = wrap(value, VAL_W, 18, EM.serif);
    const top = y;
    const out = `${i % 2 ? `<rect x="${PAD}" y="${top - 30}" width="${W - PAD * 2}" height="${lines.length * LINE + 20}" fill="${p.inset}" opacity="0.6"/>` : ""}
  <text x="${PAD + 14}" y="${top}" font-family="${SERIF}" font-size="18" font-weight="700" fill="${p.ink}">${esc(key)}</text>
  ${lines.map((l, k) => `<text x="${VAL_X}" y="${top + k * LINE}" font-family="${SERIF}" font-size="18" fill="${p.ink}">${esc(l)}</text>`).join("\n  ")}`;
    y += lines.length * LINE + 20;
    return out;
  });

  // Progress row with an animated shimmer.
  const pct = clamp(Number(card.progress?.value ?? 0), 0, 100);
  const barW = VAL_W - 90;
  const fill = r2((barW * pct) / 100);
  const py = y;
  const progress = card.progress
    ? `<text x="${PAD + 14}" y="${py}" font-family="${SERIF}" font-size="18" font-weight="700" fill="${p.ink}">${esc(card.progress.label)}</text>
  <rect x="${VAL_X}" y="${py - 13}" width="${barW}" height="14" fill="${p.faint}"/>
  <rect x="${VAL_X}" y="${py - 13}" width="${fill}" height="14" fill="url(#iris)"/>
  <g clip-path="url(#bar)"><rect x="${VAL_X - 120}" y="${py - 13}" width="120" height="14" fill="url(#shine)" class="shine"/></g>
  <text x="${VAL_X + barW + 14}" y="${py}" font-family="${MONO}" font-size="15" font-weight="700" fill="${p.accentText}">${pct}%</text>
  ${card.progress.note ? `<text x="${VAL_X}" y="${py + 26}" font-family="${MONO}" font-size="13" fill="${p.muted}">${esc(card.progress.note)}</text>` : ""}`
    : "";
  if (card.progress) y += card.progress.note ? 60 : 36;

  const H = y + 70;
  const css = `
    .shine { animation: shine 3.4s ease-in-out infinite }
    @keyframes shine { 0% { transform: translateX(0px) } 70%, 100% { transform: translateX(${fill + 120}px) } }`;
  const defs = `${irisGradient(p)}
    <linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="bar"><rect x="${VAL_X}" y="${py - 13}" width="${fill}" height="14"/></clipPath>`;

  const body = `
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <text x="${PAD}" y="30" font-family="${SERIF}" font-size="17" fill="${p.muted}"><tspan font-weight="700" fill="${p.ink}">Table 1.</tspan> <tspan font-style="italic">${esc(card.caption)}</tspan></text>
  <rect x="${PAD}" y="46" width="${W - PAD * 2}" height="2" fill="${p.ink}"/>
  <text x="${PAD + 14}" y="72" font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${p.accentText}">FIELD</text>
  <text x="${VAL_X}" y="72" font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${p.accentText}">VALUE</text>
  <rect x="${PAD}" y="82" width="${W - PAD * 2}" height="0.9" fill="${p.ink}"/>
  ${rows.join("\n  ")}
  ${progress}
  <rect x="${PAD}" y="${H - 44}" width="${W - PAD * 2}" height="2" fill="${p.ink}"/>`;

  return svg({
    w: W,
    h: H,
    title: `Table 1: ${card.caption}`,
    desc: card.rows.map(([k, v]) => `${k}: ${v}`).join(". ") + (card.progress ? `. ${card.progress.label}: ${pct}%.` : ""),
    css,
    defs,
    body,
  });
}
