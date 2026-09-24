import { PALETTES, SERIF, MONO, EM } from "../lib/palette.mjs";
import { esc, svg, rng, hash, r2, measure } from "../lib/util.mjs";

const W = 1200;
const H = 380;
const TOP = 96; // query row baseline
const BOT = 272; // key row baseline
const HEAD_S = 4; // seconds each head is in focus

/**
 * Three attention heads with different "personalities", so the cycling reads as real
 * structure rather than noise: local (self + neighbours), long-range, and one sharp head
 * driven by the `pairs` in the config.
 */
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

export function renderAttention(mode, cfg) {
  const p = PALETTES[mode];
  const a = cfg.attention;
  const tokens = a.tokens;
  const n = tokens.length;
  const index = new Map(tokens.map((t, i) => [t.toLowerCase(), i]));
  const pairs = (a.pairs ?? [])
    .map(([x, y]) => [index.get(x.toLowerCase()), index.get(y.toLowerCase())])
    .filter(([x, y]) => x !== undefined && y !== undefined);
  const H3 = heads(n, pairs, rng(hash(tokens.join("|"))));

  const left = 150;
  const right = W - 70;
  const slot = (right - left) / n;
  const xs = tokens.map((_, i) => r2(left + slot * (i + 0.5)));
  const size = Math.min(20, Math.floor((slot - 16) / (Math.max(...tokens.map((t) => [...t].length)) * EM.serif)));

  const token = (t, x, y, row) => {
    const w = r2(measure(t, size, EM.serif) + 24);
    return `<rect x="${r2(x - w / 2)}" y="${y - size - 6}" width="${w}" height="${size + 18}" fill="${p.bg}" stroke="${p.rule}"/>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" fill="${p.ink}"${row === "q" ? ` font-style="italic"` : ""}>${esc(t)}</text>`;
  };

  const cycle = HEAD_S * 3;
  const headSvg = H3.map((m, h) => {
    const color = p.iris[h];
    const lines = [];
    m.forEach((row, i) =>
      row.forEach((w, j) => {
        if (w < 0.06) return;
        lines.push(
          `<line x1="${xs[i]}" y1="${TOP + 12}" x2="${xs[j]}" y2="${BOT - size - 6}" stroke="${color}" stroke-width="${r2(0.8 + w * 7)}" stroke-opacity="${r2(0.15 + w * 0.85)}" stroke-linecap="round"/>`,
        );
      }),
    );
    return `<g class="h${h}"${h === 0 ? "" : ` opacity="0"`}>
      ${lines.join("\n      ")}
    </g>`;
  });

  const share = 100 / 3;
  const css = H3.map((_, h) => {
    const from = r2(h * share);
    const to = r2((h + 1) * share);
    const fade = 3;
    const kf =
      h === 0
        ? `0% { opacity: 1 } ${r2(to - fade)}% { opacity: 1 } ${to}% { opacity: 0 } ${r2(100 - fade)}% { opacity: 0 } 100% { opacity: 1 }`
        : `0%, ${r2(from - fade)}% { opacity: 0 } ${from}% { opacity: 1 } ${r2(to - fade)}% { opacity: 1 } ${to}%, 100% { opacity: 0 }`;
    return `@keyframes h${h} { ${kf} } .h${h} { animation: h${h} ${cycle}s ease-in-out infinite }`;
  }).join("\n    ");

  const legend = H3.map(
    (_, h) => `<g class="h${h}"${h === 0 ? "" : ` opacity="0"`}><rect x="${W - 262}" y="30" width="26" height="4" fill="${p.iris[h]}"/>
      <text x="${W - 226}" y="36" font-family="${MONO}" font-size="13" fill="${p.ink}">head ${h + 1} · ${["local", "long-range", "sharp"][h]}</text></g>`,
  ).join("\n    ");

  const body = `
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <text x="44" y="36" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${p.muted}">LAYER ${esc(a.layer ?? 12)} · 3 HEADS</text>
  ${legend}
  <text x="44" y="${TOP - 4}" font-family="${MONO}" font-size="13" fill="${p.accentText}">query</text>
  <text x="44" y="${BOT - 4}" font-family="${MONO}" font-size="13" fill="${p.accentText}">key</text>
  ${headSvg.join("\n  ")}
  ${tokens.map((t, i) => token(t, xs[i], TOP, "q")).join("\n  ")}
  ${tokens.map((t, i) => token(t, xs[i], BOT, "k")).join("\n  ")}
  <rect x="44" y="${H - 64}" width="${W - 88}" height="0.75" fill="${p.rule}"/>
  <text x="44" y="${H - 30}" font-family="${SERIF}" font-size="17" fill="${p.muted}"><tspan font-weight="700" fill="${p.ink}">Figure 1.</tspan> <tspan font-style="italic">${esc(a.caption ?? "Attention over research interests.")}</tspan></text>`;

  return svg({
    w: W,
    h: H,
    title: "Figure 1: attention over research interests",
    desc: `An attention diagram linking these research interests: ${tokens.join(", ")}. Three attention heads take turns.`,
    css,
    defs: "",
    body,
  });
}
