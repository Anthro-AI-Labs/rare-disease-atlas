# Plan — Rare Disease Atlas

## Roadmap (hours from start; each phase ends with a gate)

| Phase | Hours | Outcome | Gate (must be true to continue) |
|---|---|---|---|
| 0 Research & init | 0–1 | Repo runs, APIs verified, `docs/RESEARCH.md` | Every data source reachable or a fallback recorded |
| 1 Thin end-to-end slice | 1–4 | Base graph + mechanisms v1 + trials + web skeleton deployed | One full path for STXBP1 visible in the deployed app |
| 2 Trust layer | 4–10 | Combined clustering, contradictions, gaps, curated data, evidence panel | Counterexample test passes; every edge shows source in UI |
| 3 Action layer | 10–16 | Explanations, network overlap, patient action view, researcher view | Maria journey works end-to-end for all 8 core diseases |
| 4 Polish & proof | 16–20 | 10× page, verified badges, tests green, performance | Demo script runs without errors on the deployed URL |
| 5 Freeze & submit | 20–24 | README, DATA_SOURCES, videos, submission | Feature freeze at hour 20; only fixes after |

Scope rule: if a gate slips by more than 1 hour, cut the lowest WP of the current phase, never the gate.

## Graph model

Nodes: `disease` (OMIM id, MONDO xref, synonyms), `gene`, `phenotype` (HPO, IC), `mechanism` (controlled vocabulary),
`publication` (PMID), `investigator`, `study` (NCT id), `project` (NIH RePORTER), `patient_org`, `asset`.

Mechanism controlled vocabulary = `variant_effect` × `molecular_function`:
- variant_effect: loss_of_function | gain_of_function | dominant_negative | mixed | unclear
- molecular_function: sodium_channel | potassium_channel | synaptic_vesicle_release | synaptic_signaling |
  kinase_signaling | g_protein_signaling | other

Key relations: `causes` (gene→disease), `has_phenotype`, `has_variant_effect` (gene/disease→mechanism, llm_extracted),
`phenotypically_similar_to` (computed), `shares_mechanism_with` (computed), `studied_in` (study→disease),
`funds` (project→gene/disease), `authored` (investigator→publication), `supports` (publication→edge),
`serves` (patient_org→disease), `offers` (patient_org→asset).

## Work packages

### Phase 0
- **WP0.1 Init.** Monorepo layout from README, `Makefile`, `.env.example`, `requirements.txt`, Next.js app in `web/`.
  ✅ `make data && python pipeline/build_graph.py` reproduces ~12 diseases / ~250 edges.
- **WP0.2 Research (≤ 25 min, no code beyond probes).** Verify and record in `docs/RESEARCH.md` (≤ 1 page):
  NCBI E-utilities (esearch/efetch, rate limits, API key), ClinicalTrials.gov API v2 query params, NIH RePORTER v2
  search payload, current OpenAI Python/Node SDK structured-output call and env model, HPO/MONDO file formats.
  ✅ Each source: endpoint, one working sample request, limits, license/terms note.

### Phase 1
- **WP1.1 Base graph** (exists): move to repo, add pydantic edge schema validation on export.
- **WP1.2 Mechanism extraction v1.** Per gene: PubMed query
  `GENE[tiab] AND (loss-of-function OR gain-of-function OR haploinsufficiency OR dominant-negative OR "functional analysis")`,
  ≤ 40 abstracts, efetch → OpenAI structured output:
  `{claims:[{gene, variant_effect, molecular_function, linked_phenotype_or_disease, population(human|animal|in_vitro), quoted_span}]}`.
  Verify spans; cache by PMID + prompt hash. ✅ ≥ 8 verified mechanism edges across ≥ 6 genes; 0 unverifiable spans kept.
- **WP1.3 Trials.** ClinicalTrials.gov v2 per gene → `study` nodes + `studied_in` edges (NCT id, status, phase).
- **WP1.4 Export.** `graph.json` = `{meta:{built_at, sources:{name,version,retrieved_at}}, nodes, edges, clusters, explanations:{}}`.
- **WP1.5 Web skeleton + deploy.** Search box → disease page (cluster, related diseases with shared phenotypes,
  mechanism, trials). Deploy to Vercel. ✅ Live URL.

### Phase 2
- **WP2.1 Clustering v2.** Similarity = 0.6 × phenotype (IC-weighted Jaccard) + 0.4 × mechanism overlap.
  kNN graph (k=3) → Louvain; report stability over 30 seeds. ✅ Test: no benign counterexample shares a cluster with
  its own gene's DEE; stability ≥ 0.8 for core members (else show as "uncertain membership").
- **WP2.2 Contradictions.** Same gene + conflicting variant_effect from different PMIDs → `status=contradicted`
  unless claims are tied to different phenotypes (then `mixed`, which is a finding, not a contradiction).
- **WP2.3 Curated data.** Load `data/curated/patient_groups.csv`, `assets.csv` (formats in README). Missing → gap.
- **WP2.4 Evidence panel.** Every edge in UI: relation, evidence_type badge, source link, quoted span, confidence, contradictions.
- **WP2.5 Gap engine.** For a disease/question: list sources searched + counts; if only `computed` edges → "hypothesis";
  if none → "no supported route" + the missing evidence + a suggested question to test.

### Phase 3
- **WP3.1 Explanations.** OpenAI input = path edges JSON; output
  `{summary_plain, steps:[{text, edge_ids}], uncertainties[], next_step}`. Validator rejects unknown edge_ids.
  Pre-generate for the 8 core diseases into `graph.json`; live route only for new queries (rate-limited).
- **WP3.2 Network overlap.** Investigators from PubMed authors + RePORTER PIs shared across ≥ 2 diseases.
  Same-name ≠ same person: require matching affiliation or ORCID, else label "possible match".
- **WP3.3 Patient action view (Maria).** Related communities, shareable assets, what differs between diseases,
  what needs expert review, a sourced next-step proposal (e.g., shared natural history study).
- **WP3.4 Researcher view (Dr. Osei).** "Who works on my mechanism under other gene names."
- **WP3.5 Global search with synonym resolution** (disease, gene, symptom, patient group, mechanism; MONDO/HPO synonyms).

### Phase 4
- **WP4.1 10× page** (content from Varduhi): milestone, today's route vs ours, explicit assumptions.
- **WP4.2 Verified badges** from `data/curated/evidence_review.csv`; show "X% of sampled edges manually verified".
- **WP4.3 Tests:** span verification, schema validation, explanation validator, counterexample clustering.

### Phase 5
- README (problem, users, journey, architecture, setup, reproduce dataset, limitations), `DATA_SOURCES.md`,
  `docs/DECISIONS.md` → Tech video talking points.

## Design principles (from brief)
Low ink, high signal · one global search · summary first, depth on click · explain every edge ·
patient action view separates viable leads from unsupported links.
