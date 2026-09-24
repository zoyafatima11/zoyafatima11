import { PALETTES, MONO } from "../lib/palette.mjs";
import { esc, r2 } from "../lib/util.mjs";
import { sheet, M, INNER } from "../lib/sheet.mjs";

const LH = 30;

/** The BibTeX entry as plain text; also used for the copyable code block under the page. */
export function bibtex(cfg) {
  const b = cfg.bibtex ?? {};
  const parts = cfg.name.trim().split(/\s+/);
  const last = parts.pop();
  const author = parts.length ? `${last}, ${parts.join(" ")}` : last;
  const fields = [
    ["author", author],
    ["title", b.title ?? cfg.title?.subtitle ?? cfg.name],
    ["year", b.year ?? new Date().getUTCFullYear()],
    ["howpublished", `\\url{https://github.com/${cfg.username}}`],
    ...(b.note ? [["note", b.note]] : []),
  ];
  const w = Math.max(...fields.map(([k]) => k.length));
  return `@misc{${b.key ?? cfg.username},\n${fields.map(([k, v]) => `  ${k.padEnd(w)} = {${v}}`).join(",\n")}\n}`;
}

/** Typeset, syntax-coloured BibTeX in a line-numbered inset. */
export function renderCite(mode, cfg, page) {
  const p = PALETTES[mode];
  const lines = bibtex(cfg).split("\n");
  const boxH = lines.length * LH + 36;

  const colour = (line) => {
    let m = line.match(/^(@\w+)\{([^,]+),$/);
    if (m) return `<tspan fill="${p.iris[2]}" font-weight="700">${esc(m[1])}</tspan><tspan fill="${p.muted}">{</tspan><tspan fill="${p.accentText}">${esc(m[2])}</tspan><tspan fill="${p.muted}">,</tspan>`;
    m = line.match(/^(\s+)(\w+)(\s*=\s*)\{(.*)\}(,?)$/);
    if (m)
      return `${esc(m[1])}<tspan fill="${p.iris[1]}">${esc(m[2])}</tspan><tspan fill="${p.muted}">${esc(m[3])}{</tspan><tspan fill="${p.ink}">${esc(m[4])}</tspan><tspan fill="${p.muted}">}${m[5]}</tspan>`;
    return `<tspan fill="${p.muted}">${esc(line)}</tspan>`;
  };

  const body = `
  <rect x="${M}" y="0" width="${INNER}" height="${boxH}" fill="${p.inset}" stroke="${p.rule}"/>
  <rect x="${M}" y="0" width="54" height="${boxH}" fill="${p.faint}" opacity="0.6"/>
  ${lines
    .map(
      (l, i) => `<text x="${M + 38}" y="${r2(36 + i * LH)}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${p.muted}" opacity="0.7">${i + 1}</text>
  <text x="${M + 76}" y="${r2(36 + i * LH)}" font-family="${MONO}" font-size="17" xml:space="preserve">${colour(l)}</text>`,
    )
    .join("\n  ")}
  <text x="${M + INNER - 18}" y="30" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${p.muted}">BIBTEX</text>`;

  return sheet(mode, cfg, {
    glyph: "“ ”",
    title: "Cite this work",
    page,
    caption: "∎ *End of preprint.* Compiled nightly by GitHub Actions. The copyable BibTeX is just below.",
    content: { height: boxH + 8, body },
    desc: bibtex(cfg),
  });
}
