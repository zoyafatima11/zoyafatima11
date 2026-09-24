<!--
  README.template.md: the hand-written source of the profile README.
  Write prose here. {{placeholders}} are filled in by scripts/build.mjs from profile.config.mjs.
  Wrap a section in {{#activity}} … {{/activity}} to show it only when that data exists.
-->
{{figure:title}}

<p align="center"><sub>{{toc}}</sub></p>

## Abstract

> **We present _{{name}}_**, a researcher currently in early pre-training. Unlike models that learn from one pass over the internet, she learns the slow way: reading closely, reproducing results by hand, and asking *why* a model behaves the way it does before asking how to make it bigger.
>
> This page logs the run so far: a grounding in research methods and the fundamentals of AI. It also maps the generative-AI checkpoints she is training toward over the next few years: transformers, diffusion models, retrieval, agents and alignment. Results are preliminary. Collaborators are welcome.

{{correspondence}}

## 1. Research interests

{{figure:attention}}

Her questions sit where **how models learn** meets **what they make**: why attention works, how diffusion turns noise into structure, and how to tell when a generative model is right versus merely fluent.

## 2. Roadmap

{{figure:curve}}

## 3. Model card

{{figure:modelcard}}

{{#activity}}
## 4. Training log

{{figure:activity}}
{{/activity}}

## References

<sub>The reading queue, in the order the ideas build on each other. 📖 reading · ✅ read · ◻️ queued</sub>

{{references}}

## Cite this profile

```bibtex
{{bibtex}}
```

<p align="right"><sub><i>Last compiled by GitHub Actions. Comments and pull requests are welcome.</i> ∎</sub></p>
