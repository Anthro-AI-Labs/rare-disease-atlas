# Data sources
| Source | Used for | Licence / terms |
|---|---|---|
| Human Phenotype Ontology (hp.obo, phenotype.hpoa, genes_to_disease.txt) | diseases, genes, phenotypes, IC | HPO licence (free, cite) |
| MONDO | disease cross-references | CC BY 4.0 |
| PubMed / NCBI E-utilities | abstracts for mechanism extraction (quoted spans only) | NLM terms; abstracts © publishers |
| ClinicalTrials.gov API v2 | study nodes | public domain |
| NIH RePORTER v2 | not used in this prototype (no funding data) | public domain |
| OpenAI API | claim extraction (verified against source text) | OpenAI terms |
| `data/curated/*.csv` | patient groups, assets, manual evidence review | team-curated, dated |
Retrieval dates are in `graph.json` `meta.sources`.
