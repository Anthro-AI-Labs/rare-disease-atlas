"""Disease-level mechanism profiles, contradictions (WP2.2) and stable claim ids. Pure functions over mechanisms.json claims."""
import hashlib, json, re
from collections import defaultdict
from common import GRAPH

MIN_DIRECTIONAL = 3          # directional (non-"unclear") disease-specific claims needed before a disease has a profile
MIN_PMIDS_SIDE = 2           # each side of a contradiction needs >= 2 independent PMIDs
REDUCED, INCREASED = {"loss_of_function", "dominant_negative"}, {"gain_of_function"}
GENERIC = {"seizures", "seizure", "epilepsy", "epileptic", "encephalopathy", "disease", "syndrome", "and", "the", "of", "in", "with", "a"}


def claim_id(c):
    """Stable edge id: independent of extraction order."""
    h = hashlib.sha1(f"{c['pmid']}|{c['gene']}|{c['quoted_span']}|{c['variant_effect']}|{c['molecular_function']}".encode()).hexdigest()
    return "M" + h[:8]


def load_claims():
    p = GRAPH / "mechanisms.json"
    return json.loads(p.read_text())["claims"] if p.exists() else []


def disease_index():
    """(gene, disease name) -> disease id, from the base graph nodes."""
    from config import ALL
    out = {}
    for line in (GRAPH / "nodes.jsonl").open():
        n = json.loads(line)
        if n["type"] == "disease":
            out[(ALL[n["id"]], n["name"])] = n["id"]
    return out


def specific_claims(claims, idx, gene_level=False):
    """disease id -> claims. gene_level=True also attributes "unspecified" claims to a gene's disease when the gene has exactly one
    disease in the slice (so a gene-level claim can only be about it); genes with several diseases (SCN2A, SCN8A, KCNQ2) never get this."""
    by = defaultdict(list)
    per_gene = defaultdict(list)
    for (g, _), d in idx.items():
        per_gene[g].append(d)
    for c in claims:
        g = c["gene"].upper()
        d = idx.get((g, c["disease_context"]))
        if d is None and gene_level and c["disease_context"] == "unspecified" and len(per_gene[g]) == 1:
            d = per_gene[g][0]
        if d:
            by[d].append(c)
    return by


def directional(cs):
    return [c for c in cs if c["variant_effect"] != "unclear"]


def profile(cs):
    """Weight vectors (weights = claim confidence) over the variant_effect marginal ("E:") and the molecular_function marginal ("F:"),
    each normalised to sum 1. The joint effect x function key was too sparse/noisy (function labels vary per abstract). None if too little evidence."""
    ds = directional(cs)
    if len(ds) < MIN_DIRECTIONAL:
        return None
    v = defaultdict(float)
    for c in ds:
        v[f"E:{c['variant_effect']}"] += c["confidence"]
        v[f"F:{c['molecular_function']}"] += c["confidence"]
    te = sum(x for k, x in v.items() if k[0] == "E")
    return {k: x / te for k, x in v.items()}


def overlap(p, q):
    """Pooled weighted Jaccard of two profiles (effect and function marginals)."""
    keys = set(p) | set(q)
    return sum(min(p.get(k, 0), q.get(k, 0)) for k in keys) / sum(max(p.get(k, 0), q.get(k, 0)) for k in keys)


def dominant_effect(cs):
    ds = directional(cs)
    if len(ds) < MIN_DIRECTIONAL:
        return None
    w = defaultdict(float)
    for c in ds:
        w[c["variant_effect"]] += c["confidence"]
    return max(w, key=w.get)


def _tokens(cs):
    return {t for c in cs for t in re.findall(r"[a-z0-9]+", c["linked_phenotype_or_disease"].lower()) if t not in GENERIC}


def contradictions(claims, idx):
    """Disease-level. Reduced- vs increased-function claims, each side backed by >= MIN_PMIDS_SIDE PMIDs.
    If the two sides are tied to non-overlapping phenotypes -> 'mixed' (a finding, not a contradiction), else 'contradicted'."""
    out = []
    for d, cs in specific_claims(claims, idx).items():
        red = [c for c in cs if c["variant_effect"] in REDUCED]
        inc = [c for c in cs if c["variant_effect"] in INCREASED]
        if len({c["pmid"] for c in red}) < MIN_PMIDS_SIDE or len({c["pmid"] for c in inc}) < MIN_PMIDS_SIDE:
            continue
        a, b = _tokens(red), _tokens(inc)
        jac = len(a & b) / len(a | b) if a | b else 1.0
        out.append({"disease": d, "kind": "mixed" if jac < 0.2 else "contradicted", "phenotype_token_jaccard": round(jac, 3),
                    "reduced": [claim_id(c) for c in red], "increased": [claim_id(c) for c in inc]})
    return out
