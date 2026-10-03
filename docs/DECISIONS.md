# Decisions & dead ends (one line each)
- Base graph = existing `pipeline/build_graph.py` kept as-is (paths already repo-root relative); `status`/schema validation added in export, not in the build script.
- `make data` fetches HPO `genes_to_disease.txt` (not `genes_to_phenotype`) because build_graph reads it.
- NCBI: omit `api_key` param when unset (empty value returns "API key invalid"); throttle 3 req/s no key, 10 with.
- ClinicalTrials.gov gene search is free text, so studies are labelled "mentions gene", not "studies disease".
- Python deps in `venv/`; Python 3.14 works with pinned-free requirements.
