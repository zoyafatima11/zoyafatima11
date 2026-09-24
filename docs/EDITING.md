# Editing the profile

The profile is typeset as a single preprint. Every section is a page of the same document, with the same frame, corner marks, running head (`Z. FATIMA · ZOYA-FATIMA-V1   3 / 7`) and caption style. That shared page system is what makes it read as one piece rather than a stack of widgets.

**Everything comes from `profile.config.mjs`.** `README.md` and `assets/` are generated, so don't edit them by hand.

```bash
npm run preview   # build, then open preview.html (GitHub's own renderer, light/dark toggle)
npm run build     # just rebuild
npm test          # also run by the GitHub Action before every build
```

Pushing to `main` runs `.github/workflows/compile.yml`, which rebuilds and commits. It also runs every night to redraw the training log.

## The pages

| Page | Config | Notes |
|:--|:--|:--|
| Title page + Figure 0 | `title` | Noise resolves into a `petals`-petal rose, like a diffusion model denoising. |
| Contents tabs | — | One clickable tab per section, generated automatically. |
| ¶ Abstract | `text.abstract`, `text.abstractNote` | Two columns with a drop cap. `*italic*` and `**bold**` work. |
| Link tabs | `links` | Blank entries are hidden. Supported: `email`, `website`, `linkedin`, `scholar`, `x`, `orcid`, `huggingface`. |
| 1 Research interests | `attention`, `text.interests` | 3–10 tokens. `pairs` wire the "sharp" attention head. |
| 2 Roadmap | `roadmap` | Decimal years (`2027.5` = mid-2027). Move `now` forward as she goes; reached checkpoints turn solid. |
| 3 Model card | `modelCard` | `rows` are `[field, value]`. `progress.value` is a percentage. |
| 4 Training log | `activity` | Weekly contributions; appears once the Action has run (it needs a token). |
| [ ] References | `references`, `text.references` | Each paper is its own row, linked to arXiv. `status`: `read`, `reading`, `queued`. |
| “ ” Cite this work | `bibtex` | Typeset on the page, with a copyable code block under it. |

Page numbers, the contents tabs and the anchors are all derived from one list (`plan()` in `scripts/build.mjs`). Add or remove a page there and everything renumbers itself.

## Look and feel

- **Colours:** `scripts/lib/palette.mjs` (`light` is paper, `dark` is night; `iris` is the generative gradient).
- **Page chrome** (frame, running head, captions): `scripts/lib/sheet.mjs`.
- **Fonts:** system serif and monospace only, because GitHub serves images through a proxy that blocks web fonts.
- **Motion:** every animation is off when the viewer has `prefers-reduced-motion` set; the pages then show their finished state.
