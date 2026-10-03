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
    """Tolerant: missing file => []; BOM, header case/space, blank rows and missing columns are accepted."""
    p = CURATED / f"{name}.csv"
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8-sig") as f:
        rd = csv.DictReader(f)
        out = []
        for row in rd:
            r = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
            if any(r.values()):
                out.append({**{c: "" for c in FILES.get(name, [])}, **r})
        return out


REQUIRED = {"patient_groups": ("gene", "organization_name"), "assets": ("gene", "name")}


def usable(name, rows, slice_genes):
    """Split rows into (usable, rejected-with-reason). A gene cell may list several genes (; , / |) -> one row per gene.
    Rows missing required fields or naming a gene outside the slice are rejected, never guessed. Non-http URLs are blanked."""
    import re
    ok, bad = [], []
    for r in rows:
        miss = [c for c in REQUIRED[name] if not r.get(c)]
        if miss:
            bad.append((r, f"missing {','.join(miss)}")); continue
        for g in [x.strip().upper() for x in re.split(r"[;,/|]", r["gene"]) if x.strip()]:
            if g not in slice_genes:
                bad.append((r, f"gene {g} outside slice")); continue
            u = {**r, "gene": g}
            for k in ("url", "registry_url", "source_url"):
                if u.get(k) and not u[k].lower().startswith("http"):
                    u[k] = ""
            ok.append(u)
    return ok, bad
