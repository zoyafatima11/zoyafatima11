// "Paper & night" palette. Paper = light mode, night = dark mode.
// The three iris colours are the generative-gradient used across every figure.

export const PALETTES = {
  light: {
    bg: "#FBF8F2",
    inset: "#F3EEE4",
    ink: "#1C1A17",
    muted: "#6B6459",
    faint: "#E7E0D3",
    rule: "#CFC6B6",
    iris: ["#6D4AFF", "#1FA5B3", "#DB4A94"],
    accentText: "#5536E0",
  },
  dark: {
    bg: "#0D0B17",
    inset: "#15122A",
    ink: "#ECE8FA",
    muted: "#9A93B5",
    faint: "#221E3A",
    rule: "#3A3460",
    iris: ["#A98BFF", "#53DCE3", "#FF7AC8"],
    accentText: "#BBA6FF",
  },
};

export const MODES = Object.keys(PALETTES);

// System fonts only: images on GitHub are proxied and cannot fetch web fonts.
export const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Charter, Georgia, 'Times New Roman', serif";
export const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

// Rough average advance widths (em) for laying text out without a font engine.
export const EM = { serif: 0.5, serifBold: 0.56, serifItalic: 0.47, mono: 0.61 };

/** Linear interpolation across the iris stops, t in [0, 1]. */
export function irisAt(p, t) {
  const stops = p.iris.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export const irisGradient = (p, id = "iris", attrs = `x1="0" y1="0" x2="1" y2="0"`) =>
  `<linearGradient id="${id}" ${attrs}>${p.iris
    .map((c, i) => `<stop offset="${i / (p.iris.length - 1)}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;
