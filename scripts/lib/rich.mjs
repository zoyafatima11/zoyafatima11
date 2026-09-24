import { EM, SERIF } from "./palette.mjs";
import { esc, r2 } from "./util.mjs";

// Tiny rich-text engine for SVG: **bold** and *italic* runs, word-wrapped on estimated widths.

const emFor = (w) => (w.b ? EM.serifBold : w.i ? EM.serifItalic : EM.serif);

/** "We **present** *this*" → [{ t: "We", b, i }, …] one entry per word. */
export function parseRich(src) {
  const words = [];
  for (const part of String(src ?? "").split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)) {
    if (!part) continue;
    const b = part.startsWith("**");
    const i = !b && part.startsWith("*");
    const text = b ? part.slice(2, -2) : i ? part.slice(1, -1) : part;
    const pieces = text.split(/(\s+)/);
    pieces.forEach((piece, k) => {
      if (!piece) return;
      if (/^\s+$/.test(piece)) {
        if (words.length) words[words.length - 1].space = true;
        return;
      }
      // A word glued to the previous run ("*Fatima*,") stays glued.
      const glue = k === 0 && words.length && !words[words.length - 1].space;
      words.push({ t: piece, b, i, glue });
    });
  }
  return words;
}

const wordWidth = (w, size) => [...w.t].length * size * emFor(w);

/**
 * Wraps words into lines. `widthAt(n)` gives the width of line n, which is how drop caps
 * and hanging indents get their narrower first lines.
 */
export function wrapRich(words, widthAt, size) {
  const space = size * 0.26;
  const lines = [];
  let line = [];
  let w = 0;
  for (const word of words) {
    const add = wordWidth(word, size) + (line.length && !word.glue ? space : 0);
    if (line.length && !word.glue && w + add > widthAt(lines.length)) {
      lines.push(line);
      line = [word];
      w = wordWidth(word, size);
    } else {
      line.push(word);
      w += add;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

/** Renders wrapped lines as <text> elements, merging consecutive words of the same style. */
export function renderRich(lines, { x, y, lh, size, fill, xAt = () => x, family = SERIF, attrs = "" }) {
  return lines
    .map((line, n) => {
      const runs = [];
      for (const w of line) {
        const last = runs[runs.length - 1];
        const sep = runs.length && !w.glue ? " " : "";
        if (last && last.b === w.b && last.i === w.i) last.t += sep + w.t;
        else {
          if (last && sep) last.t += " ";
          runs.push({ t: w.t, b: w.b, i: w.i });
        }
      }
      const spans = runs
        .map((r) => (r.b || r.i ? `<tspan${r.b ? ` font-weight="700"` : ""}${r.i ? ` font-style="italic"` : ""}>${esc(r.t)}</tspan>` : esc(r.t)))
        .join("");
      return `<text x="${r2(xAt(n))}" y="${r2(y + n * lh)}" font-family="${family}" font-size="${size}" fill="${fill}" xml:space="preserve"${attrs}>${spans}</text>`;
    })
    .join("\n  ");
}

/** Convenience: parse → wrap → render, returning the SVG and the height used. */
export function paragraph(src, { x, y, width, size, lh = size * 1.5, fill, widthAt, xAt }) {
  const lines = wrapRich(parseRich(src), widthAt ?? (() => width), size);
  return { svg: renderRich(lines, { x, y, lh, size, fill, xAt }), lines: lines.length, height: lines.length * lh };
}
