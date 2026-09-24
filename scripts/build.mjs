#!/usr/bin/env node
/**
 * README.template.md + profile.config.mjs  →  README.md + assets/fig-*-{light,dark}.svg
 *
 *   node scripts/build.mjs            # build (Figure 3 only if GITHUB_TOKEN is set)
 *   node scripts/build.mjs --check    # write nothing; exit 2 if anything would change
 *
 * No dependencies; Node 18+.
 */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODES } from "./lib/palette.mjs";
import { esc, anchor, safeUrl } from "./lib/util.mjs";
import { renderTitle } from "./figures/title.mjs";
import { renderAttention } from "./figures/attention.mjs";
import { renderCurve } from "./figures/curve.mjs";
import { renderModelCard } from "./figures/modelcard.mjs";
import { renderActivity } from "./figures/activity.mjs";
import { fetchContributionWeeks } from "./lib/github.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const warn = (msg) => console.warn(`warning: ${msg}`);

export async function loadConfig(file = path.join(ROOT, "profile.config.mjs")) {
  // Cache-bust so a watcher or test can re-import after edits.
  const cfg = (await import(`${pathToFileURL(file).href}?t=${Date.now()}`)).default;
  const fail = (m) => {
    throw new Error(`profile.config.mjs: ${m}`);
  };
  if (!cfg?.username) fail(`"username" is required`);
  if (!cfg.name) fail(`"name" is required`);
  const toks = cfg.attention?.tokens ?? [];
  if (toks.length < 3 || toks.length > 10) fail(`attention.tokens needs 3 to 10 entries`);
  const r = cfg.roadmap;
  if (!r || !(r.from < r.to)) fail(`roadmap.from must be before roadmap.to`);
  if (r.now < r.from || r.now > r.to) fail(`roadmap.now must fall between from and to`);
  for (const c of r.checkpoints ?? []) {
    if (c.at < r.from || c.at > r.to) fail(`checkpoint "${c.label}" (${c.at}) is outside the roadmap range`);
  }
  for (const ref of cfg.references ?? []) {
    if (!["read", "reading", "queued"].includes(ref.status)) fail(`reference "${ref.title}" has status "${ref.status}"; use read, reading or queued`);
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// Generated Markdown fragments
// ---------------------------------------------------------------------------

const figure = (name, alt) => `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/fig-${name}-dark.svg">
  <img src="assets/fig-${name}-light.svg" alt="${esc(alt)}" width="100%">
</picture>`;

const LINKS = {
  email: { label: "email", href: (v) => `mailto:${v.replace(/^mailto:/, "")}` },
  website: { label: "website" },
  linkedin: { label: "LinkedIn" },
  scholar: { label: "Google Scholar" },
  x: { label: "X", href: (v) => (/^https?:/.test(v) ? v : `https://x.com/${v.replace(/^@/, "")}`) },
  orcid: { label: "ORCID", href: (v) => (/^https?:/.test(v) ? v : `https://orcid.org/${v}`) },
  huggingface: { label: "Hugging Face", href: (v) => (/^https?:/.test(v) ? v : `https://huggingface.co/${v}`) },
};

export function correspondence(cfg) {
  const parts = [];
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
    else parts.push(`<a href="${esc(href)}">${esc(def.label)}</a>`);
  }
  if (!parts.length) parts.push(`<a href="https://github.com/${cfg.username}">@${esc(cfg.username)}</a> on GitHub`);
  return `<p><sub>✉︎ <b>Correspondence:</b> ${parts.join(" · ")}</sub></p>`;
}

const STATUS = { read: "✅", reading: "📖", queued: "◻️" };

export function references(cfg) {
  return (cfg.references ?? [])
    .map((r, i) => {
      const link = r.arxiv ? ` [arXiv:${r.arxiv}](https://arxiv.org/abs/${r.arxiv})` : r.url ? ` [link](${r.url})` : "";
      return `${STATUS[r.status]} **[${i + 1}]** ${esc(r.authors)} (${r.year}). *${esc(r.title)}.* ${esc(r.venue ?? "")}.${link}`;
    })
    .join("<br>\n");
}

export function bibtex(cfg) {
  const b = cfg.bibtex ?? {};
  const [first, ...rest] = cfg.name.trim().split(/\s+/).reverse();
  const author = rest.length ? `${first}, ${rest.reverse().join(" ")}` : first;
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

export function renderReadme(template, cfg, { activity = false } = {}) {
  let md = template.replace(/^<!--[\s\S]*?-->\s*/, ""); // the template's own instructions
  md = md.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}\n?/g, (_, key, inner) => ({ activity }[key] ? inner : ""));

  const toc = [...md.matchAll(/^## (.+)$/gm)]
    .map(([, h]) => `<a href="#${anchor(h)}">${esc(h.replace(/^\d+\.\s*/, ""))}</a>`)
    .join(" · ");

  const alts = {
    title: `${cfg.name}: ${cfg.title?.subtitle ?? ""}`,
    attention: `Figure 1: attention between research interests (${cfg.attention.tokens.join(", ")})`,
    curve: `Figure 2: roadmap as a training-loss curve. ${cfg.roadmap.checkpoints.map((c) => `${c.label} (${Math.floor(c.at)})`).join(", ")}`,
    modelcard: `Table 1: ${cfg.modelCard.caption}`,
    activity: "Figure 3: GitHub contributions per week",
  };
  const values = {
    name: esc(cfg.name),
    username: esc(cfg.username),
    toc,
    correspondence: correspondence(cfg),
    references: references(cfg),
    bibtex: bibtex(cfg),
  };

  md = md.replace(/\{\{(figure:)?(\w+)\}\}/g, (m, isFig, key) => {
    if (isFig) {
      if (!(key in alts)) throw new Error(`README.template.md: unknown figure "${key}"`);
      return figure(key, alts[key]);
    }
    if (!(key in values)) throw new Error(`README.template.md: unknown placeholder {{${key}}}`);
    return values[key];
  });

  const banner = "<!-- Generated from README.template.md + profile.config.mjs by scripts/build.mjs. Edit those, not this file. -->";
  return `${banner}\n${md.replace(/\n{3,}/g, "\n\n").trim()}\n`;
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

async function main() {
  const check = process.argv.includes("--check");
  const cfg = await loadConfig();
  const template = await readFile(path.join(ROOT, "README.template.md"), "utf8");

  let weeks = null;
  if (cfg.activity && process.env.GITHUB_TOKEN) {
    try {
      weeks = await fetchContributionWeeks(cfg.username, process.env.GITHUB_TOKEN);
    } catch (err) {
      warn(`couldn't fetch contributions (${err.message}); leaving Figure 3 out`);
    }
  } else if (cfg.activity) {
    // Locally without a token, keep whatever the Action last generated.
    const have = await readFile(path.join(ROOT, "assets/fig-activity-dark.svg"), "utf8").catch(() => null);
    if (have) weeks = "keep";
  }

  const files = new Map();
  files.set("README.md", renderReadme(template, cfg, { activity: Boolean(weeks) }));
  for (const mode of MODES) {
    files.set(`assets/fig-title-${mode}.svg`, renderTitle(mode, cfg));
    files.set(`assets/fig-attention-${mode}.svg`, renderAttention(mode, cfg));
    files.set(`assets/fig-curve-${mode}.svg`, renderCurve(mode, cfg));
    files.set(`assets/fig-modelcard-${mode}.svg`, renderModelCard(mode, cfg));
    if (Array.isArray(weeks)) files.set(`assets/fig-activity-${mode}.svg`, renderActivity(mode, weeks));
  }

  const changed = [];
  for (const [rel, content] of files) {
    if (await writeIfChanged(path.join(ROOT, rel), content, check)) changed.push(rel);
  }
  // Drop the activity figure if the section is gone, so no orphan images linger.
  if (!weeks) {
    for (const f of await readdir(path.join(ROOT, "assets")).catch(() => [])) {
      if (!f.startsWith("fig-activity-")) continue;
      if (!check) await rm(path.join(ROOT, "assets", f));
      changed.push(`assets/${f} (removed)`);
    }
  }

  console.log(changed.length ? `${check ? "Would update" : "Updated"}: ${changed.join(", ")}` : "Everything is up to date.");
  if (check && changed.length) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`error: ${err.message}`);
    process.exit(1);
  });
}
