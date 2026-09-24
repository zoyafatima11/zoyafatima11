// The whole profile is built from this file: every page, figure and link.
// After editing: `npm run preview` to look, or just push and the Action rebuilds.
// In text fields, *italic* and **bold** work.

export default {
  username: "zoyafatima11",
  name: "Zoya Fatima",
  runningTitle: "ZOYA-FATIMA-V1", // shown top-right on every page, like a paper's running head

  // Prose
  text: {
    abstract: [
      "**We present** *Zoya Fatima*, a researcher currently in early pre-training. Unlike models that learn from one pass over the internet, she learns the slow way: reading closely, reproducing results by hand, and asking *why* a model behaves the way it does before asking how to make it bigger.",
      "This profile logs the run so far, a grounding in research methods and the fundamentals of AI, and maps the generative-AI checkpoints she is training toward over the next few years: transformers, diffusion models, retrieval, agents and alignment. Results are preliminary. **Collaborators are welcome.**",
    ],
    abstractNote: "*Correspondence:* reach her through GitHub at **@zoyafatima11**.",
    interests:
      "Her questions sit where **how models learn** meets **what they make**: why attention works, how diffusion turns noise into structure, and how to tell when a generative model is *right* rather than merely *fluent*.",
    references: "The reading queue, ordered so each idea builds on the last. Every row links to the paper on arXiv.",
  },

  // Title page (the big banner at the top)
  title: {
    header: "Preprint · v1 · 2026",
    kicker: "Researcher · AI & Generative Models",
    subtitle: "Towards machines that imagine, and knowing why they do",
    keywords: ["generative models", "diffusion", "transformers", "research methods"],
    status: "early pre-training",
    seeking: "collaborators & reading groups",
    stamp: "profile:2609.11v1 [cs.AI] 25 Sep 2026",
    petals: 8, // number of petals the noise resolves into in Figure 0
  },

  // Contact links: blank ones are hidden; filled ones become tabs under the abstract.
  links: {
    email: "",
    website: "",
    linkedin: "",
    scholar: "", // Google Scholar profile URL
    x: "",
    orcid: "",
    huggingface: "",
  },

  // Figure 1: tokens on both rows of the attention diagram. `pairs` wires the sharp head.
  attention: {
    layer: 12,
    tokens: ["research", "statistics", "learning", "attention", "diffusion", "retrieval", "agents", "alignment"],
    pairs: [
      ["research", "alignment"],
      ["statistics", "diffusion"],
      ["learning", "attention"],
      ["attention", "retrieval"],
      ["diffusion", "statistics"],
      ["retrieval", "agents"],
      ["agents", "alignment"],
      ["alignment", "research"],
    ],
    caption: "Self-attention over research interests. The three heads take turns; the sharp head encodes the connections she wants to study.",
  },

  // Figure 2: the roadmap. `now` is a decimal year (2026.75 ≈ October 2026).
  roadmap: {
    from: 2026.5,
    to: 2030,
    now: 2026.75,
    yLabel: "loss (confusion)",
    xLabel: "training time →",
    caption: "Training run zoya-v1. The observed segment is real, the rest is a projection, and every checkpoint is a goal.",
    checkpoints: [
      { at: 2026.7, label: "Research foundations", detail: "reading papers · literature review · Python · statistics" },
      { at: 2027.3, label: "Machine learning", detail: "linear algebra · classic ML · PyTorch · experiments" },
      { at: 2028.0, label: "Deep learning", detail: "CNNs · transformers · attention · training at scale" },
      { at: 2028.8, label: "Generative AI", detail: "LLMs · diffusion · RAG · agents" },
      { at: 2029.6, label: "Original research", detail: "first-author paper · alignment · evaluation" },
    ],
  },

  // Table 1: model card. Rows are [field, value].
  modelCard: {
    caption: "Model card for zoya-fatima-v1.",
    rows: [
      ["Model", "zoya-fatima-v1, an early checkpoint of a human researcher"],
      ["Architecture", "Curiosity-first; asks why before how"],
      ["Intended use", "Research collaboration, paper reading groups, reproducing results, careful GenAI experiments"],
      ["Training data", "Research papers, lecture notes, textbooks, open-source notebooks"],
      ["Current skills", "Research methods, literature review, Python, statistics, AI fundamentals"],
      ["Fine-tuning on", "Machine learning → deep learning → generative models"],
      ["Known limitations", "Context window is currently full of unread papers"],
      ["Evaluation", "Ongoing; see Figure 2 for the training curve"],
    ],
    progress: { label: "Pre-training", value: 18, note: "loss still dropping ↓" },
  },

  // References: the reading queue. status is "read", "reading" or "queued".
  references: [
    { authors: "Kingma & Welling", year: 2013, title: "Auto-Encoding Variational Bayes", venue: "ICLR 2014", arxiv: "1312.6114", status: "queued" },
    { authors: "Goodfellow et al.", year: 2014, title: "Generative Adversarial Nets", venue: "NeurIPS 2014", arxiv: "1406.2661", status: "queued" },
    { authors: "Vaswani et al.", year: 2017, title: "Attention Is All You Need", venue: "NeurIPS 2017", arxiv: "1706.03762", status: "reading" },
    { authors: "Brown et al.", year: 2020, title: "Language Models are Few-Shot Learners", venue: "NeurIPS 2020", arxiv: "2005.14165", status: "queued" },
    { authors: "Ho, Jain & Abbeel", year: 2020, title: "Denoising Diffusion Probabilistic Models", venue: "NeurIPS 2020", arxiv: "2006.11239", status: "queued" },
    { authors: "Lewis et al.", year: 2020, title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", venue: "NeurIPS 2020", arxiv: "2005.11401", status: "queued" },
    { authors: "Hu et al.", year: 2021, title: "LoRA: Low-Rank Adaptation of Large Language Models", venue: "ICLR 2022", arxiv: "2106.09685", status: "queued" },
    { authors: "Rombach et al.", year: 2021, title: "High-Resolution Image Synthesis with Latent Diffusion Models", venue: "CVPR 2022", arxiv: "2112.10752", status: "queued" },
    { authors: "Wei et al.", year: 2022, title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", venue: "NeurIPS 2022", arxiv: "2201.11903", status: "queued" },
    { authors: "Ouyang et al.", year: 2022, title: "Training Language Models to Follow Instructions with Human Feedback", venue: "NeurIPS 2022", arxiv: "2203.02155", status: "queued" },
  ],

  // "Cite this work" BibTeX entry.
  bibtex: {
    key: "fatima2026imagine",
    title: "Towards Machines That Imagine: A Researcher's Training Run",
    year: 2026,
    note: "Early checkpoint; results preliminary",
  },

  // Training log page (weekly contributions). Needs a token, so only the GitHub Action draws it.
  activity: true,
};
