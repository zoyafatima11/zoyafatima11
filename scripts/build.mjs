#!/usr/bin/env node
/**
 * profile.config.mjs  →  README.md + assets/*.svg
 *
 * The README is laid out as one typeset preprint: every section is a "page" drawn by
 * scripts/pages/*, sharing the frame, running head and page numbers in scripts/lib/sheet.mjs.
 *
 *   node scripts/build.mjs            # build (Figure 3 only when GITHUB_TOKEN is set)
 *   node scripts/build.mjs --check    # write nothing; exit 2 if anything would change
 *
 * No dependencies; Node 18+.
 */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODES } from "./lib/palette.mjs";
import { esc, safeUrl } from "./lib/util.mjs";
import { renderTitle } from "./pages/title.mjs";
import { renderAbstract } from "./pages/abstract.mjs";
import { renderInterests } from "./pages/interests.mjs";
import { renderRoadmap } from "./pages/roadmap.mjs";
import { renderModelCard } from "./pages/modelcard.mjs";
import { renderActivity } from "./pages/activity.mjs";
import { renderReferencesHeader, renderReferenceRow } from "./pages/references.mjs";
import { renderCite, bibtex } from "./pages/cite.mjs";
import { renderTab } from "./pages/tabs.mjs";
import { fetchContributionWeeks } from "./lib/github.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const warn = (msg) => console.warn(`warning: ${msg}`);

export async function loadConfig(file = path.join(ROOT, "profile.config.mjs")) {
  const cfg = (await import(`${pathToFileURL(file).href}?t=${Date.now()}`)).default;
  const fail = (m) => {
    throw new Error(`profile.config.mjs: ${m}`);
  };
  if (!cfg?.username) fail(`"username" is required`);
  if (!cfg.name) fail(`"name" is required`);
  for (const k of ["abstract", "interests", "references"]) if (!cfg.text?.[k]) fail(`text.${k} is required`);
  const toks = cfg.attention?.tokens ?? [];
  if (toks.length < 3 || toks.length > 10) fail(`attention.tokens needs 3 to 10 entries`);
  const r = cfg.roadmap;
  if (!r || !(r.from < r.to)) fail(`roadmap.from must be before roadmap.to`);
  if (r.now < r.from || r.now > r.to) fail(`roadmap.now must fall between from and to`);
  for (const c of r.checkpoints ?? []) if (c.at < r.from || c.at > r.to) fail(`checkpoint "${c.label}" (${c.at}) is outside the roadmap range`);
  for (const ref of cfg.references ?? []) {
    if (!["read", "reading", "queued"].includes(ref.status)) fail(`reference "${ref.title}" has status "${ref.status}"; use read, reading or queued`);
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// Links (correspondence tabs)
// ---------------------------------------------------------------------------

const LINKS = {
  email: { label: "Email", glyph: "@", href: (v) => `mailto:${v.replace(/^mailto:/, "")}` },
  website: { label: "Website", glyph: "↗" },
  linkedin: { label: "LinkedIn", glyph: "in" },
  scholar: { label: "Scholar", glyph: "G" },
  x: { label: "X", glyph: "𝕏", href: (v) => (/^https?:/.test(v) ? v : `https://x.com/${v.replace(/^@/, "")}`) },
  orcid: { label: "ORCID", glyph: "iD", href: (v) => (/^https?:/.test(v) ? v : `https://orcid.org/${v}`) },
  huggingface: { label: "Hugging Face", glyph: "🤗", href: (v) => (/^https?:/.test(v) ? v : `https://huggingface.co/${v}`) },
};

export function links(cfg) {
  const out = [];
  for (const [key, raw] of Object.entries(cfg.links ?? {})) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const def = LINKS[key];
    if (!def) {
      warn(`unknown link "${key}" (supported: ${Object.keys(LINKS).join(", ")})`);
      continue;
    }
    const href = safeUrl(def.href ? def.href(v) : v);
    if (!href) warn(`link "${key}" is not a valid URL: ${v}`);
    else out.push({ ...def, key, href });
  }
  return out;
}

// ---------------------------------------------------------------------------
// README assembly
// ---------------------------------------------------------------------------

const picture = (file, alt, width = "100%") =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${file}-dark.svg"><img src="assets/${file}-light.svg" alt="${esc(alt)}" width="${width}"></picture>`;

/** Section list in page order. Everything (page numbers, tabs, README) derives from this. */
export function plan(cfg, { activity }) {
  const pages = [
    { id: "top", file: "p-title", tab: null, render: renderTitle, alt: `${cfg.name}: ${cfg.title.subtitle}` },
    { id: "abstract", file: "p-abstract", tab: { glyph: "¶", label: "Abstract" }, render: renderAbstract, alt: `Abstract. ${cfg.text.abstract.join(" ").replace(/\*/g, "")}` },
    { id: "interests", file: "p-interests", tab: { glyph: "1", label: "Interests" }, render: renderInterests, alt: `Research interests: ${cfg.attention.tokens.join(", ")}` },
    { id: "roadmap", file: "p-roadmap", tab: { glyph: "2", label: "Roadmap" }, render: renderRoadmap, alt: `Roadmap: ${cfg.roadmap.checkpoints.map((c) => c.label).join(" → ")}` },
    { id: "model-card", file: "p-modelcard", tab: { glyph: "3", label: "Model card" }, render: renderModelCard, alt: `Model card: ${cfg.modelCard.rows.map(([k, v]) => `${k}: ${v}`).join("; ")}` },
    ...(activity ? [{ id: "training-log", file: "p-activity", tab: null, render: renderActivity, alt: "Training log: GitHub contributions per week" }] : []),
    { id: "references", file: "p-references", tab: { glyph: "[ ]", label: "Reading" }, render: renderReferencesHeader, alt: "References: her reading queue" },
    { id: "cite", file: "p-cite", tab: { glyph: "“”", label: "Cite" }, render: renderCite, alt: "Cite this work (BibTeX below)" },
  ];
  return pages.map((pg, i) => ({ ...pg, page: { n: i + 1, total: pages.length } }));
}

export function renderReadme(cfg, pages) {
  const out = ["<!-- Generated by scripts/build.mjs from profile.config.mjs. Edit that, not this file. -->", ""];
  const tabs = pages.filter((pg) => pg.tab);
  const ls = links(cfg);

  for (const pg of pages) {
    out.push(`<a id="${pg.id}"></a>${picture(pg.file, pg.alt)}`, "");

    if (pg.id === "top") {
      const w = `${Math.floor((100 / tabs.length - 0.9) * 10) / 10}%`;
      out.push(`<p align="center">${tabs.map((t) => `<a href="#${t.id}">${picture(`tab-${t.id}`, t.tab.label, w)}</a>`).join(" ")}</p>`, "");
    }
    if (pg.id === "abstract" && ls.length) {
      const w = `${Math.min(24, Math.floor((100 / ls.length - 1) * 10) / 10)}%`;
      out.push(`<p align="center">${ls.map((l) => `<a href="${esc(l.href)}">${picture(`link-${l.key}`, l.label, w)}</a>`).join(" ")}</p>`, "");
    }
    if (pg.id === "references") {
      const rows = cfg.references.map((r, i) => {
        const href = r.arxiv ? `https://arxiv.org/abs/${r.arxiv}` : safeUrl(r.url);
        const img = picture(`ref-${String(i + 1).padStart(2, "0")}`, `[${i + 1}] ${r.authors} (${r.year}). ${r.title}. ${r.venue ?? ""}`);
        return href ? `<a href="${esc(href)}">${img}</a>` : img;
      });
      out.push(`<p>\n${rows.join("\n")}\n</p>`, "");
    }
    if (pg.id === "cite") {
      out.push("<details><summary><sub>Copy BibTeX</sub></summary>", "", "```bibtex", bibtex(cfg), "```", "</details>", "");
    }
  }
  out.push(`<p align="right"><a href="#top"><sub>↑ back to the title page</sub></a></p>`);
  return `${out.join("\n").trim()}\n`;
}

// ---------------------------------------------------------------------------

async function writeIfChanged(file, content, check) {
  const current = await readFile(file, "utf8").catch(() => null);
  if (current === content) return false;
  if (!check) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return true;
}

/** `activity` puts the training-log page in the plan; its SVG is only drawn when `weeks` is data. */
export async function buildFiles(cfg, weeks, { activity = Array.isArray(weeks) } = {}) {
  const pages = plan(cfg, { activity });
  const files = new Map([["README.md", renderReadme(cfg, pages)]]);
  for (const mode of MODES) {
    for (const pg of pages) {
      if (pg.render === renderActivity && !Array.isArray(weeks)) continue;
      files.set(`assets/${pg.file}-${mode}.svg`, pg.render(mode, cfg, pg.page, weeks));
    }
    for (const pg of pages.filter((x) => x.tab)) files.set(`assets/tab-${pg.id}-${mode}.svg`, renderTab(mode, { ...pg.tab, sub: `page ${pg.page.n}` }));
    for (const l of links(cfg)) files.set(`assets/link-${l.key}-${mode}.svg`, renderTab(mode, { glyph: l.glyph, label: l.label }));
    cfg.references.forEach((r, i) => files.set(`assets/ref-${String(i + 1).padStart(2, "0")}-${mode}.svg`, renderReferenceRow(mode, r, i)));
  }
  return files;
}

async function main() {
  const check = process.argv.includes("--check");
  const cfg = await loadConfig();

  let weeks = null;
  if (cfg.activity && process.env.GITHUB_TOKEN) {
    try {
      weeks = await fetchContributionWeeks(cfg.username, process.env.GITHUB_TOKEN);
    } catch (err) {
      warn(`couldn't fetch contributions (${err.message}); leaving the training log out`);
    }
  }
  // Locally (no token) keep the page the Action last drew instead of deleting it.
  const keepActivity = !weeks && !process.env.GITHUB_TOKEN && (await readFile(path.join(ROOT, "assets/p-activity-dark.svg"), "utf8").catch(() => null));

  // With a kept page, page numbers and the README still count it; its SVG is left as is.
  const files = await buildFiles(cfg, weeks, { activity: Array.isArray(weeks) || Boolean(keepActivity) });

  const changed = [];
  for (const [rel, content] of files) if (await writeIfChanged(path.join(ROOT, rel), content, check)) changed.push(rel);

  // Remove generated assets that no longer belong (renamed links, fewer references, …).
  for (const f of await readdir(path.join(ROOT, "assets")).catch(() => [])) {
    const rel = `assets/${f}`;
    if (files.has(rel) || (keepActivity && f.startsWith("p-activity-"))) continue;
    if (!check) await rm(path.join(ROOT, rel));
    changed.push(`${rel} (removed)`);
  }

  console.log(`${files.size} files generated.`);
  console.log(changed.length ? `${check ? "Would update" : "Updated"}: ${changed.join(", ")}` : "Everything is up to date.");
  if (check && changed.length) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`error: ${err.message}`);
    process.exit(1);
  });
}
