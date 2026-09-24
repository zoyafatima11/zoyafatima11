import { PALETTES, SERIF, MONO, EM, irisGradient } from "./palette.mjs";
import { esc, svg, r2, glyphWidth } from "./util.mjs";
import { paragraph } from "./rich.mjs";

// Every block of the profile is a "page" of the same preprint: one frame, one running head,
// one caption style. Keeping this in one place is what makes the README read as one document.

export const W = 1200;
export const M = 64; // side margin
export const TOP = 132; // where page content starts
export const INNER = W - M * 2;

const tick = (x, y, dx, dy, c) => `<path d="M${x} ${y + dy * 16} L${x} ${y} L${x + dx * 16} ${y}" fill="none" stroke="${c}" stroke-width="1.5"/>`;

export function frame(p, w, h) {
  const c = p.accentText;
  return `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" fill="none" stroke="${p.rule}" stroke-width="1.5"/>
  <g opacity="0.7">${tick(12, 12, 1, 1, c)}${tick(w - 12, 12, -1, 1, c)}${tick(12, h - 12, 1, -1, c)}${tick(w - 12, h - 12, -1, -1, c)}</g>`;
}

export const paper = (p, w, h) => `<rect width="${w}" height="${h}" fill="${p.bg}"/>
  <rect width="${w}" height="${h}" fill="url(#grain)" opacity="0.55"/>`;

export const baseDefs = (p) => `
    ${irisGradient(p)}
    <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="${p.faint}"/></pattern>`;

/** Right-hand running head, e.g. "Z. Fatima · zoya-fatima-v1     3 / 8". */
export function runningHead(p, cfg, page, y = 64) {
  const [first, ...rest] = cfg.name.split(/\s+/);
  const short = `${first[0]}. ${rest.join(" ") || first}`;
  return `<text x="${W - M}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="12.5" letter-spacing="1.5" fill="${p.muted}">${esc(short.toUpperCase())}  ·  ${esc(cfg.runningTitle ?? cfg.username)}<tspan fill="${p.accentText}" font-weight="700">    ${page.n} / ${page.total}</tspan></text>`;
}

export const doubleRule = (p, y, x0 = M, x1 = W - M) =>
  `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="1.5" fill="${p.ink}"/><rect x="${x0}" y="${y + 4}" width="${x1 - x0}" height="0.75" fill="${p.ink}"/>`;

/**
 * Wraps page content (drawn with its origin at the top of the content area) in the shared
 * chrome. `glyph` is the section mark: a numeral, ¶, [ ], and so on.
 */
export function sheet(mode, cfg, { glyph, title, page, caption, content, desc }) {
  const p = PALETTES[mode];
  const cap = caption
    ? paragraph(caption, { x: M, y: 0, width: INNER, size: 16.5, lh: 24, fill: p.muted })
    : null;
  const footH = cap ? 40 + cap.height + 14 : 44;
  const H = Math.ceil(TOP + content.height + footH);
  const gw = glyphWidth(glyph, 46) + 18;

  const body = `
  ${paper(p, W, H)}
  <text x="${M}" y="76" font-family="${SERIF}" font-style="italic" font-size="46" font-weight="700" fill="url(#iris)">${esc(glyph)}</text>
  <text x="${r2(M + gw)}" y="73" font-family="${SERIF}" font-size="32" font-weight="700" letter-spacing="-0.4" fill="${p.ink}">${esc(title)}</text>
  ${runningHead(p, cfg, page, 70)}
  ${doubleRule(p, 92)}
  <g transform="translate(0 ${TOP})">
  ${content.body}
  </g>
  ${cap ? `<rect x="${M}" y="${H - footH + 10}" width="${INNER}" height="0.75" fill="${p.rule}"/>
  <g transform="translate(0 ${H - footH + 44})">
  ${cap.svg}
  </g>` : ""}
  ${frame(p, W, H)}`;

  return svg({
    w: W,
    h: H,
    title: `${title}${page ? ` (page ${page.n} of ${page.total})` : ""}`,
    desc: desc ?? "",
    css: content.css ?? "",
    defs: baseDefs(p) + (content.defs ?? ""),
    body,
  });
}
