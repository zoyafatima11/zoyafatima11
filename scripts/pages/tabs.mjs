import { PALETTES, SERIF, MONO, EM } from "../lib/palette.mjs";
import { esc, svg, r2, measure, glyphWidth } from "../lib/util.mjs";
import { baseDefs, frame } from "../lib/sheet.mjs";

// Small linked "tabs": the contents bar under the title page and the correspondence links.
// Each is its own image so each can be its own link.

export const TAB_W = 240;
export const TAB_H = 72;

export function renderTab(mode, { glyph, label, sub }) {
  const p = PALETTES[mode];
  const gw = glyphWidth(glyph, 30);
  const lw = measure(label, 21, EM.serif);
  const x0 = (TAB_W - (gw + 12 + lw)) / 2;
  const body = `
  <rect width="${TAB_W}" height="${TAB_H}" fill="${p.bg}"/>
  <text x="${r2(x0)}" y="${sub ? 42 : 46}" font-family="${SERIF}" font-style="italic" font-weight="700" font-size="30" fill="url(#iris)">${esc(glyph)}</text>
  <text x="${r2(x0 + gw + 12)}" y="${sub ? 40 : 44}" font-family="${SERIF}" font-size="21" fill="${p.ink}">${esc(label)}</text>
  ${sub ? `<text x="${TAB_W / 2}" y="60" text-anchor="middle" font-family="${MONO}" font-size="10.5" letter-spacing="1.5" fill="${p.muted}">${esc(sub.toUpperCase())}</text>` : ""}
  <rect x="${TAB_W / 2 - 16}" y="${TAB_H - 5}" width="32" height="2" fill="url(#iris)"/>
  ${frame(p, TAB_W, TAB_H).replace(/<g opacity[\s\S]*<\/g>/, "")}`;
  return svg({ w: TAB_W, h: TAB_H, title: label, desc: sub ?? "", defs: baseDefs(p), body });
}
