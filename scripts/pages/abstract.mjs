import { PALETTES, SERIF, EM } from "../lib/palette.mjs";
import { esc, r2 } from "../lib/util.mjs";
import { parseRich, wrapRich, renderRich } from "../lib/rich.mjs";
import { sheet, M, INNER } from "../lib/sheet.mjs";

const SIZE = 19.5;
const LH = 31;
const GUTTER = 56;
const PARA_GAP = 16;
const CAP_SIZE = 104;

/** The abstract, set in two columns with an iris drop cap, like the first page of a paper. */
export function renderAbstract(mode, cfg, page) {
  const p = PALETTES[mode];
  const colW = (INNER - GUTTER) / 2;
  const paras = cfg.text.abstract.map(parseRich);

  // Pull the first letter out for the drop cap.
  const first = paras[0][0];
  const cap = first.t[0];
  first.t = first.t.slice(1);
  // Capitals are much wider than the average glyph; W and M wider still.
  const capW = cap ? CAP_SIZE * (/[WM]/.test(cap) ? 0.98 : /[A-Z]/.test(cap) ? 0.74 : EM.serifBold) + 14 : 0;

  // Wrap everything into one stream of lines, then split the stream across two columns.
  const stream = [];
  paras.forEach((words, k) => {
    const lines = wrapRich(words, (n) => colW - (k === 0 && n < 3 ? capW : 0), SIZE);
    lines.forEach((line, n) => stream.push({ line, indent: k === 0 && n < 3 ? capW : 0, gap: n === 0 && k > 0 ? PARA_GAP : 0 }));
  });
  const total = stream.reduce((s, l) => s + LH + l.gap, 0);
  let acc = 0;
  let split = stream.length;
  for (let i = 0; i < stream.length; i++) {
    acc += LH + stream[i].gap;
    if (acc >= total / 2) {
      split = i + 1;
      break;
    }
  }

  const column = (items, x) => {
    let y = 26;
    return items
      .map((it, i) => {
        y += i === 0 ? 0 : LH + it.gap;
        return renderRich([it.line], { x: x + it.indent, y, lh: LH, size: SIZE, fill: p.ink });
      })
      .join("\n  ");
  };
  const colA = stream.slice(0, split);
  const colB = stream.slice(split).map((it, i) => (i === 0 ? { ...it, gap: 0 } : it));
  const height = (items) => items.reduce((s, it, i) => s + (i ? LH + it.gap : 0), 0);
  const bodyH = Math.max(height(colA), height(colB)) + 44;

  const body = `
  <text x="${M - 4}" y="${26 + 2 * LH}" font-family="${SERIF}" font-size="${CAP_SIZE}" font-weight="700" fill="url(#iris)">${esc(cap)}</text>
  ${column(colA, M)}
  <rect x="${r2(M + colW + GUTTER / 2)}" y="4" width="0.75" height="${bodyH - 24}" fill="${p.rule}"/>
  ${column(colB, M + colW + GUTTER)}`;

  return sheet(mode, cfg, {
    glyph: "¶",
    title: "Abstract",
    page,
    caption: Object.values(cfg.links ?? {}).some((v) => String(v ?? "").trim())
      ? `${cfg.text.abstractNote} Links are just below this page.`
      : cfg.text.abstractNote,
    content: { height: bodyH, body },
    desc: cfg.text.abstract.join(" ").replace(/\*/g, ""),
  });
}
