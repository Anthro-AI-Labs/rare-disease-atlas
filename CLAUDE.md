# Rare Disease Atlas — Hack-Nation Challenge 05 (OpenAI × Buffalo Initiative)

## Goal
Evidence-backed knowledge graph that connects rare diseases by **mechanism and phenotype** (not by name),
so a patient-group leader ("Maria") goes: disease → supported connection → existing asset/patient group →
collaborator → concrete next step. If no supported link exists, say so and show what evidence is missing.
Full brief: `docs/brief.pdf`. Roadmap and acceptance criteria: `docs/PLAN.md`.

## Focused slice (do not expand without asking)
8 developmental & epileptic encephalopathies: STXBP1, SCN2A, SCN8A, KCNQ2, KCNT1, SYNGAP1, CDKL5, GNAO1.
Counterexamples (same gene, benign phenotype): SCN2A-BFIS3, SCN8A-BFIS5, KCNQ2-BFNS1. Contrast: SCN1A Dravet.
Defined in `pipeline/config.py`.

## Non-negotiable rules (judged: evidence integrity)
1. Every edge has: `id, source, target, relation, evidence_type, source_db, references[], retrieved_at, confidence, status`.
   `evidence_type` ∈ {curated, computed, llm_extracted, manual}. `status` ∈ {supported, contradicted, hypothesis}.
2. LLM-extracted claims must carry a `quoted_span` that is an **exact substring** (whitespace-normalized) of the source
   abstract. If it does not match, drop the claim. Never invent PMIDs, URLs, organizations or numbers.
3. Computed similarity is a **hypothesis**, never presented as evidence of shared mechanism.
4. Generated explanations may only cite edge IDs present in the input path; validate and reject otherwise.
5. UI must distinguish observed vs inferred, show source + confidence + contradictions beside each edge,
   and show "Not medical advice."
6. Gaps are first-class: when no supported route exists, show sources searched, counts, and the missing evidence.

## Stack
- `pipeline/` Python 3.11, requests, networkx, pydantic, openai. Run from repo root.
- `web/` Next.js (App Router, TypeScript, Tailwind), deployed on Vercel (root dir `web`). Reads `web/public/data/graph.json`.
- OpenAI only server-side (`web/app/api/explain/route.ts`) and in the pipeline. Model from `OPENAI_MODEL` env; never hard-code.
- Data: `data/raw/` (gitignored), `data/cache/` (gitignored API/LLM cache), `data/curated/` (Varduhi's CSVs), `data/graph/` (built, committed).

## Commands
- `make data` download raw HPO/MONDO · `make graph` full pipeline → `data/graph/` + `web/public/data/graph.json`
- `make test` pytest · `cd web && npm run dev`

## Working style (save tokens)
- Never print or read large files whole: use `head`, `grep`, `wc`, small Python probes.
- Cache every network/LLM call by key in `data/cache/`; never re-call on rerun.
- Prefer small, verified steps; run code after writing it. Commit at each milestone with a clear message.
- Keep docs short. Log decisions and dead ends in `docs/DECISIONS.md` (one line each) — used for the Tech video.
- If an external API is unreachable, record it in `docs/DECISIONS.md`, degrade gracefully, and continue.
