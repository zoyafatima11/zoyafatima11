export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const chars = (s) => [...String(s ?? "")].length;
export const measure = (s, size, em) => chars(s) * size * em;
export const r2 = (n) => Math.round(n * 100) / 100;

/** Width of a short display glyph (section marks, link icons), which average-width estimates get wrong. */
export const glyphWidth = (g, size) =>
  [...String(g)].reduce(
    (w, ch) =>
      w +
      size *
        (/\s/.test(ch) ? 0.25 : /[\[\]“”¶§1-9]/.test(ch) ? 0.38 : /[@&%WM]/.test(ch) ? 0.92 : /\p{Extended_Pictographic}/u.test(ch) ? 1.2 : 0.5),
    0,
  );
export const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Greedy word wrap on estimated width; an ellipsis marks text cut at `maxLines`. */
export function wrap(text, maxWidth, size, em, maxLines = Infinity) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  let cut = false;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (!line || measure(next, size, em) <= maxWidth) {
      line = next;
    } else if (lines.length + 1 >= maxLines) {
      cut = true;
      break;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (cut) {
    let last = lines.pop();
    while (last.includes(" ") && measure(`${last}…`, size, em) > maxWidth) last = last.replace(/\s+\S+$/, "");
    lines.push(`${last.replace(/[,.;:]+$/, "")}…`);
  }
  return lines;
}

/** Small seeded PRNG (mulberry32) so figures are identical on every build. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.gauss = () => {
    const u = next() || 1e-9;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  return next;
}

export const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) >>> 0, 7);

/** GitHub's heading-anchor algorithm, close enough for our headings. */
export const anchor = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

export const safeUrl = (u) => {
  try {
    const url = new URL(String(u ?? "").trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

/** A standard SVG shell: title/desc for screen readers, a style block, defs, then the body. */
export const svg = ({ w, h, title, desc = "", css = "", defs = "", body }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>
  <style>
    ${css.trim()}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important } }
  </style>
  <defs>${defs}</defs>
${body}
</svg>
`;
