# Research notes (probed 2026-10-03; one real request per source)

| Source | Endpoint / sample | Limits | Terms / gotchas |
|---|---|---|---|
| PubMed E-utilities | `esearch.fcgi?db=pubmed&term=STXBP1[tiab] AND (haploinsufficiency OR "functional analysis")&retmode=json` → 49 hits; `efetch.fcgi?db=pubmed&id=PMID&retmode=xml` → `<AbstractText>` | 3 req/s without key, 10 with `api_key`. **Omit `api_key` entirely if unset** (empty string → "API key invalid"). Send `tool` + `email`. | Public domain metadata; abstracts may be copyrighted by publishers: we store only short verified quoted spans + PMID. Abstracts can have multiple/labelled `<AbstractText>` parts; some records have none. |
| ClinicalTrials.gov v2 | `GET /api/v2/studies?query.term=STXBP1&pageSize=100&fields=NCTId,BriefTitle,OverallStatus,Phase,Condition&countTotal=true` → 12 for STXBP1 | No published hard limit; paginate via `nextPageToken`. | Public domain. Term search is free-text (gene symbol also matches unrelated text) → keep `conditions` for the UI and label as "mentions gene". |
| NIH RePORTER v2 | `POST /v2/projects/search` body `{"criteria":{"advanced_text_search":{"operator":"and","search_field":"projecttitle","search_text":"STXBP1"}},"limit":1}` → 2 hits | ~1 req/s requested. | Public domain. Not needed in Phase 1 (Phase 3 investigators/funding). |
| HPO releases | `github.com/obophenotype/human-phenotype-ontology/releases/latest/download/{hp.obo,phenotype.hpoa,genes_to_disease.txt}` (11/36/1.5 MB) | none | HPO licence: free with attribution/citation; retain release version in provenance. |
| MONDO | `github.com/monarch-initiative/mondo/releases/latest/download/mondo.obo` (53 MB) | none | CC BY 4.0. OMIM xrefs carry `MONDO:equivalentTo`. |
| OpenAI | Python SDK 3.x: `client.chat.completions.parse(model=OPENAI_MODEL, messages, response_format=PydanticModel)` | per account | **Not yet probed: `OPENAI_API_KEY`/`OPENAI_MODEL` empty in `.env`.** Node route (`web/app/api/explain`) is Phase 3. |

Gotchas: `genes_to_disease.txt` (not `genes_to_phenotype`) is what `build_graph.py` reads. `latest` redirects on GitHub; record fetch date in `data/raw/RETRIEVED_AT`.
