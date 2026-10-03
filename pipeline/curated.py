"""Loaders for team-curated CSVs in data/curated/. Missing files => empty list (gaps are first-class)."""
import csv
from common import CURATED

FILES = {
    "patient_groups": ["gene", "organization_name", "url", "country", "has_registry", "registry_url", "date_checked", "notes"],
    "assets": ["gene", "asset_type", "name", "identifier", "source_url", "status", "date_checked", "notes"],
    "evidence_review": ["edge_id", "gene", "claim", "quoted_span", "pmid", "about_this_gene", "same_mechanism",
                        "human_patients", "verdict", "notes"],
}


def load(name):
    p = CURATED / f"{name}.csv"
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]
