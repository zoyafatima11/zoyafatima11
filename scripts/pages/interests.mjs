import { PALETTES, SERIF, MONO, EM } from "../lib/palette.mjs";
import { esc, rng, hash, r2, measure } from "../lib/util.mjs";
import { paragraph } from "../lib/rich.mjs";
import { sheet, W, M, INNER } from "../lib/sheet.mjs";

const Q = 70; // query row baseline (content coords)
const K = 250; // key row baseline
const HEAD_S = 4;
const NAMES = ["local", "long-range", "sharp"];

/** Three heads with distinct behaviour: local, long-range, and one wired from config `pairs`. */
function heads(n, pairs, rand) {
  const norm = (row) => {
    const s = row.reduce((a, b) => a + b, 0) || 1;
    return row.map((v) => v / s);
  };
  const local = Array.from({ length: n }, (_, i) =>
    norm(Array.from({ length: n }, (_, j) => (i === j ? 1 : Math.abs(i - j) === 1 ? 0.45 : 0.04 * rand()))),
  );
  const long = Array.from({ length: n }, (_, i) =>
    norm(Array.from({ length: n }, (_, j) => (Math.abs(i - j) >= Math.ceil(n / 2) ? 0.5 + rand() : 0.05 * rand()))),
  );
  const sharp = Array.from({ length: n }, (_, i) => {
    const row = Array.from({ length: n }, () => 0.03 * rand());
    const hits = pairs.filter(([a]) => a === i).map(([, b]) => b);
    if (!hits.length) row[(i + 1 + Math.floor(rand() * (n - 1))) % n] = 1;
    for (const b of hits) row[b] = 1;
    return norm(row);
  });
  return [local, long, sharp];
}

export function renderInterests(mode, cfg, page) {
  const p = PALETTES[mode];
  const a = cfg.attention;
  const tokens = a.tokens;
  const n = tokens.length;
  const index = new Map(tokens.map((t, i) => [t.toLowerCase(), i]));
  const pairs = (a.pairs ?? [])
    .map(([x, y]) => [index.get(x.toLowerCase()), index.get(y.toLowerCase())])
    .filter(([x, y]) => x !== undefined && y !== undefined);
  const H3 = heads(n, pairs, rng(hash(tokens.join("|"))));

  const left = M + 76;
  const right = W - M;
  const slot = (right - left) / n;
  const xs = tokens.map((_, i) => r2(left + slot * (i + 0.5)));
  const size = Math.min(20, Math.floor((slot - 18) / (Math.max(...tokens.map((t) => [...t].length)) * EM.serif)));

  const token = (t, x, y, italic) => {
    const w = r2(measure(t, size, EM.serif) + 24);
    return `<rect x="${r2(x - w / 2)}" y="${y - size - 7}" width="${w}" height="${size + 19}" fill="${p.bg}" stroke="${p.rule}"/>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" fill="${p.ink}"${italic ? ` font-style="italic"` : ""}>${esc(t)}</text>`;
  };

  const headSvg = H3.map((m, h) => {
    const lines = [];
    m.forEach((row, i) =>
      row.forEach((w, j) => {
        if (w < 0.06) return;
        lines.push(`<line x1="${xs[i]}" y1="${Q + 13}" x2="${xs[j]}" y2="${K - size - 7}" stroke="${p.iris[h]}" stroke-width="${r2(0.8 + w * 7)}" stroke-opacity="${r2(0.15 + w * 0.85)}" stroke-linecap="round"/>`);
      }),
    );
    return `<g class="h${h}"${h ? ` opacity="0"` : ""}>${lines.join("")}</g>`;
  });

  const share = 100 / 3;
  const css = H3.map((_, h) => {
    const from = r2(h * share);
    const to = r2((h + 1) * share);
    const kf =
      h === 0
        ? `0% { opacity: 1 } ${r2(to - 3)}% { opacity: 1 } ${to}% { opacity: 0 } 97% { opacity: 0 } 100% { opacity: 1 }`
        : `0%, ${r2(from - 3)}% { opacity: 0 } ${from}% { opacity: 1 } ${r2(to - 3)}% { opacity: 1 } ${to}%, 100% { opacity: 0 }`;
    return `@keyframes h${h} { ${kf} } .h${h} { animation: h${h} ${HEAD_S * 3}s ease-in-out infinite }`;
  }).join("\n    ");

  // Head legend: all three listed, the active one lit.
  const itemW = NAMES.map((nm, h) => 30 + measure(`head ${h + 1} · ${nm}`, 12.5, EM.mono) + 26);
  const legend = H3.map((_, h) => {
    const x = r2(W - M - itemW.slice(h).reduce((a, b) => a + b, 0) + 26);
    return `<g opacity="0.35"><rect x="${x}" y="2" width="22" height="4" fill="${p.iris[h]}"/><text x="${x + 30}" y="8" font-family="${MONO}" font-size="12.5" fill="${p.muted}">head ${h + 1} · ${NAMES[h]}</text></g>
    <g class="h${h}"${h ? ` opacity="0"` : ""}><rect x="${x}" y="2" width="22" height="4" fill="${p.iris[h]}"/><text x="${x + 30}" y="8" font-family="${MONO}" font-size="12.5" fill="${p.ink}">head ${h + 1} · ${NAMES[h]}</text></g>`;
  }).join("\n  ");

  const prose = paragraph(cfg.text.interests, { x: M, y: K + 72, width: INNER, size: 19.5, lh: 31, fill: p.ink });

  const body = `
  <text x="${M}" y="8" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${p.muted}">LAYER ${esc(a.layer ?? 12)}  ·  ${n} TOKENS  ·  3 HEADS</text>
  ${legend}
  <text x="${M}" y="${Q - 4}" font-family="${MONO}" font-size="13" fill="${p.accentText}">query</text>
  <text x="${M}" y="${K - 4}" font-family="${MONO}" font-size="13" fill="${p.accentText}">key</text>
  ${headSvg.join("\n  ")}
  ${tokens.map((t, i) => token(t, xs[i], Q, true)).join("\n  ")}
  ${tokens.map((t, i) => token(t, xs[i], K, false)).join("\n  ")}
  ${prose.svg}`;

  return sheet(mode, cfg, {
    glyph: "1",
    title: "Research interests",
    page,
    caption: `**Figure 1.** *${a.caption}*`,
    content: { height: K + 72 + prose.height - 8, body, css },
    desc: `Attention diagram linking: ${tokens.join(", ")}. ${cfg.text.interests.replace(/\*/g, "")}`,
  });
}
