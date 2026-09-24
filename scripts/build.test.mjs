import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadConfig, renderReadme, bibtex, references, correspondence } from "./build.mjs";
import { renderTitle } from "./figures/title.mjs";
import { renderAttention } from "./figures/attention.mjs";
import { renderCurve } from "./figures/curve.mjs";
import { renderModelCard } from "./figures/modelcard.mjs";
import { renderActivity } from "./figures/activity.mjs";
import { wrap, anchor, rng } from "./lib/util.mjs";
import { MODES } from "./lib/palette.mjs";

const cfg = await loadConfig();
const template = await readFile(new URL("../README.template.md", import.meta.url), "utf8");
const weeks = Array.from({ length: 53 }, (_, i) => ({
  start: new Date(Date.UTC(2025, 8, 28 + i * 7)).toISOString().slice(0, 10),
  count: i % 5,
}));

test("every figure renders valid-looking SVG in both modes", () => {
  for (const mode of MODES) {
    for (const out of [
      renderTitle(mode, cfg),
      renderAttention(mode, cfg),
      renderCurve(mode, cfg),
      renderModelCard(mode, cfg),
      renderActivity(mode, weeks),
      renderActivity(mode, weeks.map((w) => ({ ...w, count: 0 }))),
    ]) {
      assert.equal(out.match(/<svg\b/g).length, 1);
      assert.doesNotMatch(out, /undefined|NaN|\[object/);
      assert.doesNotMatch(out, /&(?!amp;|lt;|gt;|quot;|#39;)/);
    }
  }
});

test("figures are deterministic (no churn on rebuild)", () => {
  assert.equal(renderTitle("dark", cfg), renderTitle("dark", cfg));
  assert.equal(renderCurve("light", cfg), renderCurve("light", cfg));
  const a = rng(42);
  const b = rng(42);
  assert.equal(a(), b());
});

test("README fills every placeholder and links the TOC to real headings", () => {
  const md = renderReadme(template, cfg, { activity: false });
  assert.doesNotMatch(md, /\{\{[#\/]?[\w:]+\}\}/);
  assert.doesNotMatch(md, /Training log/);
  for (const [, href] of md.matchAll(/<a href="#([^"]+)">/g)) {
    const heading = [...md.matchAll(/^## (.+)$/gm)].map(([, h]) => anchor(h));
    assert.ok(heading.includes(href), `TOC link #${href} has no heading`);
  }
  assert.match(renderReadme(template, cfg, { activity: true }), /fig-activity-dark\.svg/);
});

test("unknown placeholders fail loudly", () => {
  assert.throws(() => renderReadme("{{nope}}", cfg), /unknown placeholder/);
  assert.throws(() => renderReadme("{{figure:nope}}", cfg), /unknown figure/);
});

test("heading anchors match GitHub", () => {
  assert.equal(anchor("1. Research interests"), "1-research-interests");
  assert.equal(anchor("Cite this profile"), "cite-this-profile");
});

test("bibtex, references and correspondence", () => {
  assert.match(bibtex(cfg), /author\s+= \{Fatima, Zoya\}/);
  assert.match(references(cfg), /\[arXiv:1706\.03762\]\(https:\/\/arxiv\.org\/abs\/1706\.03762\)/);
  assert.match(correspondence({ ...cfg, links: {} }), /on GitHub/);
  assert.match(correspondence({ ...cfg, links: { email: "a@b.co" } }), /mailto:a@b\.co/);
});

test("wrap never exceeds the line limit", () => {
  const lines = wrap("a b c d e f g h i j k l m n o p", 30, 10, 0.5, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("…"));
});
