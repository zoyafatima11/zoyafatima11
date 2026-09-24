import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, plan, renderReadme, buildFiles, links } from "./build.mjs";
import { bibtex } from "./pages/cite.mjs";
import { parseRich, wrapRich } from "./lib/rich.mjs";
import { rng } from "./lib/util.mjs";

const cfg = await loadConfig();
const weeks = Array.from({ length: 53 }, (_, i) => ({
  start: new Date(Date.UTC(2025, 8, 28 + i * 7)).toISOString().slice(0, 10),
  count: i % 5,
}));

test("every generated SVG is well formed and free of template leaks", async () => {
  for (const w of [null, weeks, weeks.map((x) => ({ ...x, count: 0 }))]) {
    const files = await buildFiles(cfg, w);
    for (const [name, out] of files) {
      if (!name.endsWith(".svg")) continue;
      assert.equal(out.match(/<svg\b/g).length, 1, name);
      assert.doesNotMatch(out, /undefined|NaN|\[object/, name);
      assert.doesNotMatch(out, /&(?!amp;|lt;|gt;|quot;|#39;)/, name);
    }
  }
});

test("builds are deterministic, so the nightly job only commits real changes", async () => {
  const a = await buildFiles(cfg, weeks);
  const b = await buildFiles(cfg, weeks);
  for (const [k, v] of a) assert.equal(b.get(k), v, k);
  assert.equal(rng(42)(), rng(42)());
});

test("page numbers are consistent and count the optional training log", () => {
  const without = plan(cfg, { activity: false });
  const withLog = plan(cfg, { activity: true });
  assert.equal(withLog.length, without.length + 1);
  for (const pages of [without, withLog]) pages.forEach((pg, i) => assert.deepEqual(pg.page, { n: i + 1, total: pages.length }));
});

test("README: every tab points at an anchor, every image exists, every paper links out", async () => {
  const files = await buildFiles(cfg, null);
  const md = files.get("README.md");
  const ids = new Set([...md.matchAll(/<a id="([^"]+)">/g)].map((m) => m[1]));
  for (const [, href] of md.matchAll(/<a href="#([^"]+)">/g)) assert.ok(ids.has(href), `#${href} has no anchor`);
  for (const [, src] of md.matchAll(/(?:src|srcset)="(assets\/[^"]+)"/g)) assert.ok(files.has(src), `${src} is not generated`);
  assert.equal([...md.matchAll(/https:\/\/arxiv\.org\/abs\//g)].length, cfg.references.length);
  assert.match(md, /```bibtex\n@misc\{/);
});

test("links: blanks hidden, bad URLs skipped", () => {
  assert.equal(links({ links: {} }).length, 0);
  const ls = links({ links: { email: "a@b.co", x: "@zoya", website: "javascript:alert(1)" } });
  assert.deepEqual(ls.map((l) => l.href), ["mailto:a@b.co", "https://x.com/zoya"]);
});

test("bibtex puts the family name first", () => {
  assert.match(bibtex(cfg), /author\s+= \{Fatima, Zoya\}/);
});

test("rich text keeps punctuation glued to styled words", () => {
  const words = parseRich("We present *Zoya Fatima*, a researcher");
  assert.deepEqual(words.map((w) => w.t), ["We", "present", "Zoya", "Fatima", ",", "a", "researcher"]);
  assert.equal(words[4].glue, true);
  assert.ok(wrapRich(words, () => 60, 10).every((line) => !line[0].glue));
});
