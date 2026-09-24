import { PALETTES, SERIF, MONO, EM } from "../lib/palette.mjs";
import { esc, r2, clamp } from "../lib/util.mjs";
import { paragraph } from "../lib/rich.mjs";
import { sheet, W, M, INNER } from "../lib/sheet.mjs";

const KEY_W = 250;
const VAL_X = M + KEY_W + 24;
const VAL_W = W - M - VAL_X - 14;
const LINE = 27;

/** Table 1: a model card for her, booktabs style (heavy top/bottom rules, light midrule). */
export function renderModelCard(mode, cfg, page) {
  const p = PALETTES[mode];
  const card = cfg.modelCard;

  let y = 70;
  const rows = card.rows.map(([key, value], i) => {
    const val = paragraph(value, { x: VAL_X, y, width: VAL_W, size: 18.5, lh: LINE, fill: p.ink });
    const out = `${i % 2 ? `<rect x="${M}" y="${y - 30}" width="${INNER}" height="${val.height + 18}" fill="${p.inset}" opacity="0.75"/>` : ""}
  <text x="${M + 14}" y="${y}" font-family="${SERIF}" font-size="18.5" font-weight="700" fill="${p.ink}">${esc(key)}</text>
  ${val.svg}`;
    y += val.height + 18;
    return out;
  });

  const pct = clamp(Number(card.progress?.value ?? 0), 0, 100);
  const barW = VAL_W - 80;
  const fill = r2((barW * pct) / 100);
  const py = y + 8;
  if (card.progress) y += card.progress.note ? 66 : 40;

  const body = `
  <rect x="${M}" y="0" width="${INNER}" height="2" fill="${p.ink}"/>
  <text x="${M + 14}" y="28" font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${p.accentText}">FIELD</text>
  <text x="${VAL_X}" y="28" font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${p.accentText}">VALUE</text>
  <rect x="${M}" y="40" width="${INNER}" height="0.9" fill="${p.ink}"/>
  ${rows.join("\n  ")}
  ${card.progress ? `<text x="${M + 14}" y="${py}" font-family="${SERIF}" font-size="18.5" font-weight="700" fill="${p.ink}">${esc(card.progress.label)}</text>
  <rect x="${VAL_X}" y="${py - 13}" width="${barW}" height="14" fill="${p.faint}"/>
  <rect x="${VAL_X}" y="${py - 13}" width="${fill}" height="14" fill="url(#iris)"/>
  <g clip-path="url(#bar)"><rect x="${VAL_X - 120}" y="${py - 13}" width="120" height="14" fill="url(#shine)" class="shine"/></g>
  <text x="${VAL_X + barW + 14}" y="${py}" font-family="${MONO}" font-size="15" font-weight="700" fill="${p.accentText}">${pct}%</text>
  ${card.progress.note ? `<text x="${VAL_X}" y="${py + 28}" font-family="${MONO}" font-size="13" fill="${p.muted}">${esc(card.progress.note)}</text>` : ""}` : ""}
  <rect x="${M}" y="${y}" width="${INNER}" height="2" fill="${p.ink}"/>`;

  return sheet(mode, cfg, {
    glyph: "3",
    title: "Model card",
    page,
    caption: `**Table 1.** *${card.caption}*`,
    content: {
      height: y + 4,
      body,
      css: `.shine { animation: shine 3.4s ease-in-out infinite } @keyframes shine { 0% { transform: translateX(0px) } 70%, 100% { transform: translateX(${fill + 120}px) } }`,
      defs: `
    <linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="bar"><rect x="${VAL_X}" y="${py - 13}" width="${fill}" height="14"/></clipPath>`,
    },
    desc: card.rows.map(([k, v]) => `${k}: ${v}`).join(". ") + (card.progress ? `. ${card.progress.label}: ${pct}%.` : ""),
  });
}
