# Editing the profile

The profile is laid out like a research paper: a title page, an abstract, numbered figures, a model card table, references and a BibTeX block. Two files drive all of it:

| File | What you change there |
|:--|:--|
| `README.template.md` | **The writing.** The abstract, section headings, and the paragraphs between figures. Plain Markdown. |
| `profile.config.mjs` | **The data.** Name, title page, figure contents, the reading list and the model card. It's a JS file so it can hold comments. |

`README.md` and everything in `assets/` are generated. Don't edit those by hand; your changes would be overwritten on the next build.

## Build and preview

```bash
npm run build     # regenerate README.md + figures
npm run preview   # build, then open preview.html (GitHub's own renderer, with a light/dark toggle)
npm test
```

You don't have to build locally at all. Pushing to `main` runs `.github/workflows/compile.yml`, which rebuilds and commits. It also runs every night to refresh Figure 3.

## The figures

| Figure | Config key | Notes |
|:--|:--|:--|
| Title page + Figure 0 | `title` | Noise resolves into a rose curve with `petals` petals, like a diffusion model denoising. |
| Figure 1: attention | `attention` | 3–10 `tokens`. `pairs` are the links drawn by the "sharp" head. |
| Figure 2: roadmap | `roadmap` | Years are decimals (`2027.5` = mid-2027). Move `now` forward as she goes; checkpoints before `now` turn solid. |
| Table 1: model card | `modelCard` | `rows` are `[field, value]` pairs. `progress.value` is a percentage. |
| Figure 3: training log | `activity` | Weekly contributions. Needs a token, so only the Action draws it. It shows "warming up" until she has commits. |

## Template placeholders

`{{name}}` · `{{username}}` · `{{toc}}` · `{{correspondence}}` · `{{references}}` · `{{bibtex}}` · `{{figure:title|attention|curve|modelcard|activity}}`

Wrap a block in `{{#activity}} … {{/activity}}` to show it only once contribution data exists. A misspelled placeholder fails the build instead of shipping broken.

## Keeping it current

- **Reading list:** change a reference's `status` to `reading` or `read`. The icons update.
- **Progress:** bump `roadmap.now` and `modelCard.progress.value` every few months.
- **Contact:** fill in `links` (`email`, `website`, `linkedin`, `scholar`, `x`, `orcid`, `huggingface`).
- **Colours:** edit `scripts/lib/palette.mjs` (`light` = paper, `dark` = night).
