# rare-disease-atlas
Evidence-backed knowledge graph connecting rare diseases by mechanism and phenotype, so patient groups can find collaborators, shared assets and a next step. Hack-Nation 7th Global AI Hackathon, Challenge 05.


> **Not medical advice.** Research prototype. Computed similarity is a hypothesis, never evidence of shared mechanism.

## Setup
```bash
python3 -m venv venv && . venv/bin/activate && pip install -r requirements.txt
cp .env.example .env        # fill OPENAI_API_KEY, OPENAI_MODEL, NCBI_EMAIL; NCBI_API_KEY optional
cd web && npm install
```
`NCBI_API_KEY` empty ⇒ the `api_key` parameter is omitted and requests are throttled to 3/s (10/s with a key).

## Reproduce the dataset
```bash
make data     # HPO (hp.obo, phenotype.hpoa, genes_to_disease.txt) + MONDO -> data/raw (gitignored)
make graph    # base graph -> ClinicalTrials.gov -> mechanism extraction -> clustering -> data/graph/graph.json (+ web/public/data/graph.json)
make test     # pytest: span verification, edge schema, explanation-id validator
make dev      # web app on http://localhost:3000
```
`make graph` is idempotent: every PubMed / ClinicalTrials.gov / OpenAI call is cached in `data/cache/` (gitignored). The mechanism step is skipped with a notice if `OPENAI_API_KEY`/`OPENAI_MODEL` are unset.
Expected base graph: 12 diseases, ~250 edges (HPO), plus trial and mechanism edges.

## Curated data (all files optional; missing file ⇒ shown as a gap)
`data/curated/patient_groups.csv`
```
gene,organization_name,url,country,has_registry,registry_url,date_checked,notes
```
`data/curated/assets.csv`
```
gene,asset_type,name,identifier,source_url,status,date_checked,notes
```
`data/curated/evidence_review.csv`
```
edge_id,gene,claim,quoted_span,pmid,about_this_gene,same_mechanism,human_patients,verdict,notes
```
`gene` must be one of the 8 slice genes (or SCN1A). Never enter a URL or organization you have not verified.

## Deploy (Vercel)
Project root directory: `web`. Framework: Next.js. The app reads the committed `web/public/data/graph.json`, so no build-time env vars are needed in Phase 1.
Later phases add `OPENAI_API_KEY` and `OPENAI_MODEL` (server-side only, for `/api/explain`).
```bash
cd web && vercel link && vercel deploy --prod
```
See `docs/PLAN.md` (roadmap), `docs/DECISIONS.md`, `docs/RESEARCH.md`, `DATA_SOURCES.md`.

## Evidence review
`python pipeline/make_review_v2.py` writes `data/curated/evidence_review_v2.csv` (24 random claims, 8 per confidence tier). Fill `verdict` with `correct`, `partial` or `incorrect`; `make graph` then reports precision per tier on the home page. `evidence_review.csv` (v1) is a priority sample and is not used for precision.
