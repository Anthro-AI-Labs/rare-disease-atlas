You are the engineer on a 24-hour hackathon project. Read `CLAUDE.md` and `docs/PLAN.md` first; they are the
source of truth. Skim `docs/brief.pdf` once for intent (do not summarize it back to me).

Execute **Phase 0 and Phase 1** of `docs/PLAN.md` in order, end to end, without stopping for confirmation
unless a blocker below occurs.

## Phase 0 — research, then init
1. Research (time-box ~25 min, probes only). For each source verify with ONE real small request:
   NCBI E-utilities (PubMed esearch/efetch), ClinicalTrials.gov API v2, NIH RePORTER API v2,
   OpenAI SDK structured outputs (Python and Node; model from `OPENAI_MODEL`), HPO + MONDO release files on GitHub.
   Write `docs/RESEARCH.md` (≤ 1 page): endpoint, working sample, rate limits, terms/license note, gotchas.
2. Init the monorepo exactly as in README/PLAN: `pipeline/`, `data/{raw,cache,curated,graph}`, `web/` (Next.js App Router,
   TypeScript, Tailwind), `Makefile` (data, graph, test, dev), `.env.example`, `.gitignore`
   (data/raw, data/cache, .env*, venv, __pycache__), `requirements.txt`, `DATA_SOURCES.md`, `docs/DECISIONS.md`.
   Keep the existing `pipeline/config.py` and `pipeline/build_graph.py` (tested on real data); adapt paths only.
3. `make data && python pipeline/build_graph.py` must reproduce ~12 diseases / ~250 edges. Commit.

## Phase 1 — thin end-to-end slice
Implement WP1.1–WP1.5 from PLAN.md:
- Pydantic models for nodes/edges; validate on export.
- `pipeline/extract_mechanisms.py`: PubMed → OpenAI structured output → exact quoted-span verification → cached.
  Map to the controlled mechanism vocabulary. Drop unverifiable claims and log the drop rate.
- `pipeline/fetch_assets.py`: ClinicalTrials.gov v2 per gene → study nodes/edges.
- `pipeline/export.py`: merge everything → `data/graph/graph.json` and copy to `web/public/data/graph.json`.
- `make graph` runs the whole pipeline idempotently from cache.
- Web: search box (disease/gene names + synonyms) → disease page with: cluster, related diseases with "why"
  (top shared informative phenotypes, labeled as hypothesis), mechanism claims with quoted span + PMID link,
  trials, an evidence badge per edge, and a visible "Not medical advice" notice. Minimal, clean, low-ink design.
- Add a tiny `pytest` suite: span verification, edge schema, explanation-id validator stub.
- Write README sections: setup, how to reproduce the dataset, and the CSV formats for curated data:
  `patient_groups.csv`: gene, organization_name, url, country, has_registry, registry_url, date_checked, notes
  `assets.csv`: gene, asset_type, name, identifier, source_url, status, date_checked, notes
  `evidence_review.csv`: edge_id, gene, claim, quoted_span, pmid, about_this_gene, same_mechanism, human_patients, verdict, notes
  The loader must accept missing files.
- Prepare Vercel: root directory `web`, env vars documented. If the Vercel CLI is available and authenticated, deploy;
  otherwise give me the exact steps.

## Blockers — stop and ask me only if
- `OPENAI_API_KEY` is missing or invalid, or no `OPENAI_MODEL` is set.
- A required data source is unreachable AND no fallback exists.
- A change would expand scope beyond the 8-gene slice.

## Quality bar
- Run what you write. No placeholder data presented as real; synthetic or empty states must be labeled.
- Never invent identifiers, URLs or citations.
- Commit after each WP with a clear message. Append one-line decisions/dead ends to `docs/DECISIONS.md`.

## When done, reply with ONLY
1. Gate check for Phase 1 (pass/fail + evidence: counts, live URL or deploy steps).
2. Numbers: nodes, edges by evidence_type, verified mechanism claims, span drop rate, trials found.
3. Top 3 risks for Phase 2 and what you'd cut first.
