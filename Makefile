PY ?= venv/bin/python
HPO = https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download
MONDO = https://github.com/monarch-initiative/mondo/releases/latest/download

.PHONY: data base cluster mechanisms trials graph test dev
data:
	mkdir -p data/raw
	for f in hp.obo phenotype.hpoa genes_to_disease.txt; do [ -s data/raw/$$f ] || curl -sSL -o data/raw/$$f $(HPO)/$$f; done
	[ -s data/raw/mondo.obo ] || curl -sSL -o data/raw/mondo.obo $(MONDO)/mondo.obo
	date -u +%Y-%m-%d > data/raw/RETRIEVED_AT

base:
	$(PY) pipeline/build_graph.py
cluster:
	$(PY) pipeline/cluster.py
mechanisms:
	$(PY) pipeline/extract_mechanisms.py
trials:
	$(PY) pipeline/fetch_assets.py
graph: base trials mechanisms cluster
	$(PY) pipeline/network.py
	$(PY) pipeline/export.py
	$(PY) pipeline/explain.py
	$(PY) pipeline/export.py
test:
	$(PY) -m pytest -q pipeline/tests
dev:
	cd web && npm run dev
