import { PALETTES, SERIF, MONO, EM } from "../lib/palette.mjs";
import { esc, svg, r2 } from "../lib/util.mjs";
import { paragraph } from "../lib/rich.mjs";
import { sheet, baseDefs, paper, W, M, INNER } from "../lib/sheet.mjs";

// The References page is a header sheet plus one linked row per paper: each row is its own
// image so it can link straight to arXiv.

const ROW_H = 92;

function statusGlyph(p, status, cx, cy) {
  if (status === "read") return `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${p.iris[0]}"/>`;
  if (status === "reading")
    return `<circle cx="${cx}" cy="${cy}" r="11" fill="${p.iris[2]}" class="ping"/>
  <circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="${p.iris[2]}" stroke-width="2"/>
  <path d="M${cx} ${cy - 6.5} A6.5 6.5 0 0 1 ${cx} ${cy + 6.5} Z" fill="${p.iris[2]}"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="${p.muted}" stroke-width="1.8"/>`;
}

const LABEL = { read: "read", reading: "reading now", queued: "queued" };

export function renderReferencesHeader(mode, cfg, page) {
  const p = PALETTES[mode];
  const intro = paragraph(cfg.text.references, { x: M, y: 24, width: INNER - 420, size: 19.5, lh: 31, fill: p.ink });
  const lx = W - M - 380;
  const legend = ["read", "reading", "queued"]
    .map((s, i) => `${statusGlyph(p, s, lx + 12 + i * 128, 18)}<text x="${lx + 28 + i * 128}" y="23" font-family="${MONO}" font-size="13" fill="${p.ink}">${LABEL[s]}</text>`)
    .join("\n  ");
  const counts = ["read", "reading", "queued"].map((s) => cfg.references.filter((r) => r.status === s).length);
  return sheet(mode, cfg, {
    glyph: "[ ]",
    title: "References",
    page,
    content: {
      height: Math.max(intro.height, 60) + 8,
      body: `${intro.svg}
  ${legend}
  <text x="${lx}" y="56" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${p.muted}">${counts[0]} READ · ${counts[1]} IN PROGRESS · ${counts[2]} QUEUED</text>`,
      css: `.ping { animation: ping 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center } @keyframes ping { from { opacity: .5; transform: scale(.6) } to { opacity: 0; transform: scale(1.6) } }`,
    },
    desc: `${cfg.text.references.replace(/\*/g, "")} ${counts[0]} read, ${counts[1]} reading, ${counts[2]} queued.`,
  });
}

export function renderReferenceRow(mode, ref, index) {
  const p = PALETTES[mode];
  const n = `[${index + 1}]`;
  const titleW = INNER - 120 - 250;
  const title = paragraph(`**${ref.title}**`, { x: M + 72, y: 38, width: titleW, size: 19.5, lh: 26, fill: p.ink });
  const oneLine = title.lines === 1;
  const clipped = oneLine ? title.svg : paragraph(`**${shorten(ref.title, titleW, 19.5)}**`, { x: M + 72, y: 38, width: 10_000, size: 19.5, fill: p.ink }).svg;
  const active = ref.status === "reading";
  const link = ref.arxiv ? `arXiv:${ref.arxiv}` : ref.url ? "link" : "";

  const body = `
  ${paper(p, W, ROW_H)}
  ${active ? `<rect x="0" y="0" width="5" height="${ROW_H}" fill="url(#irisV)"/>` : ""}
  <text x="${M}" y="38" font-family="${MONO}" font-size="15" font-weight="700" fill="${p.accentText}">${n}</text>
  ${clipped}
  <text x="${M + 72}" y="66" font-family="${SERIF}" font-style="italic" font-size="16.5" fill="${p.muted}">${esc(ref.authors)} · ${esc(ref.venue ?? ref.year)}</text>
  ${statusGlyph(p, ref.status, W - M - 150, 33)}
  <text x="${W - M - 134}" y="38" font-family="${MONO}" font-size="13" fill="${active ? p.iris[2] : p.muted}">${LABEL[ref.status]}</text>
  ${link ? `<text x="${W - M}" y="66" text-anchor="end" font-family="${MONO}" font-size="13.5" fill="${p.accentText}">${esc(link)} ↗</text>` : ""}
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${ROW_H - 1.5}" fill="none" stroke="${p.rule}" stroke-width="1.5"/>`;

  return svg({
    w: W,
    h: ROW_H,
    title: `[${index + 1}] ${ref.authors} (${ref.year}). ${ref.title}. ${ref.venue ?? ""}`,
    desc: `Status: ${LABEL[ref.status]}.`,
    css: `.ping { animation: ping 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center } @keyframes ping { from { opacity: .5; transform: scale(.6) } to { opacity: 0; transform: scale(1.6) } }`,
    defs: `${baseDefs(p)}
    <linearGradient id="irisV" x1="0" y1="0" x2="0" y2="1">${p.iris.map((c, i) => `<stop offset="${i / 2}" stop-color="${c}"/>`).join("")}</linearGradient>`,
    body,
  });
}

function shorten(text, width, size) {
  let t = text;
  while (t.length > 4 && [...`${t}…`].length * size * EM.serifBold > width) t = t.replace(/\s*\S+$/, "");
  return `${t.replace(/[,:;]+$/, "")}…`;
}
