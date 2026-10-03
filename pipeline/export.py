"""WP1.4: merge base graph + trials + mechanisms + curated CSVs -> data/graph/graph.json (+ web copy). Validates schema."""
import datetime, json, re, shutil, sys
from collections import Counter
from common import GRAPH, ROOT
from config import ALL, CORE, COUNTEREXAMPLES
import curated
from models import Edge, Node

TODAY = datetime.date.today().isoformat()


def jl(name):
    p = GRAPH / name
    return [json.loads(l) for l in p.open()] if p.exists() else []


def jload(name):
    p = GRAPH / name
    return json.loads(p.read_text()) if p.exists() else None


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def build():
    nodes = {n["id"]: n for n in jl("nodes.jsonl")}
    edges = jl("edges.jsonl")
    for e in edges:  # base edges: curated -> supported; computed -> hypothesis (rule 3)
        e["status"] = "hypothesis" if e["evidence_type"] == "computed" else "supported"
    gene_diseases = {}
    for d, g in ALL.items():
        if d in nodes and d not in COUNTEREXAMPLES:
            gene_diseases.setdefault(g, []).append(d)
    sources = [{"name": "HPO + MONDO", "retrieved_at": (GRAPH.parent / "raw" / "RETRIEVED_AT").read_text().strip()
                if (GRAPH.parent / "raw" / "RETRIEVED_AT").exists() else TODAY}]
    counter = {"T": 0, "M": 0, "C": 0}

    def add(prefix, **kw):
        counter[prefix] += 1
        e = {"id": f"{prefix}{counter[prefix]:05d}", "retrieved_at": TODAY, **kw}
        edges.append(e)

    # --- trials (ClinicalTrials.gov) ---
    tr = jload("trials.json")
    trial_stats = None
    if tr:
        sources.append({"name": "ClinicalTrials.gov API v2", "retrieved_at": tr["retrieved_at"]})
        studies = {s["nct"]: s for s in tr["studies"]}
        used = set()
        for l in tr["links"]:
            if not l["gene_in_record"]:
                continue  # free-text hit only; not asserted
            s = studies[l["nct"]]
            used.add(l["nct"])
            nodes[s["nct"]] = {"id": s["nct"], "type": "study", "name": s["title"], "status": s["status"],
                               "phases": s["phases"], "conditions": s["conditions"],
                               "url": f"https://clinicaltrials.gov/study/{s['nct']}"}
            for d in gene_diseases.get(l["gene"], []):
                add("T", source=s["nct"], target=d, relation="studied_in", evidence_type="curated",
                    source_db="ClinicalTrials.gov API v2", references=[s["nct"]], confidence=0.6, status="supported",
                    note=f"Registry record names {l['gene']} in title/conditions/keywords; confirm the disease/variant is in scope.")
        trial_stats = {"studies_fetched": len(studies), "studies_in_graph": len(used)}

    # --- mechanisms (LLM, span-verified) ---
    mech = jload("mechanisms.json")
    if mech:
        sources.append({"name": f"PubMed + OpenAI ({mech['model']})", "retrieved_at": mech["retrieved_at"]})
        for c in mech["claims"]:
            mid = f"MECH:{c['variant_effect']}|{c['molecular_function']}"
            nodes.setdefault(mid, {"id": mid, "type": "mechanism",
                                   "name": f"{c['variant_effect'].replace('_', ' ')} · {c['molecular_function'].replace('_', ' ')}",
                                   "variant_effect": c["variant_effect"], "molecular_function": c["molecular_function"]})
            nodes.setdefault(f"PMID:{c['pmid']}", {"id": f"PMID:{c['pmid']}", "type": "publication", "name": c["title"],
                                                   "year": c["year"], "url": f"https://pubmed.ncbi.nlm.nih.gov/{c['pmid']}/"})
            add("M", source=f"HGNC_SYMBOL:{c['gene'].upper()}", target=mid, relation="has_variant_effect",
                evidence_type="llm_extracted", source_db=f"PubMed abstract + {mech['model']}",
                references=[f"PMID:{c['pmid']}"], confidence=0.6 if c["population"] == "human" else 0.5,
                status="supported", quoted_span=c["quoted_span"], population=c["population"],
                linked_phenotype_or_disease=c["linked_phenotype_or_disease"])

    # --- curated CSVs (missing => empty) ---
    pg, assets = curated.load("patient_groups"), curated.load("assets")
    for r in pg:
        oid = f"ORG:{slug(r['organization_name'])}"
        nodes.setdefault(oid, {"id": oid, "type": "patient_org", "name": r["organization_name"], "url": r["url"],
                               "country": r["country"], "has_registry": r["has_registry"].lower() in ("1", "true", "yes"),
                               "registry_url": r["registry_url"]})
        for d in gene_diseases.get(r["gene"].upper(), []):
            add("C", source=oid, target=d, relation="serves", evidence_type="manual", source_db="curated patient_groups.csv",
                references=[r["url"]] if r["url"] else [], confidence=0.8, status="supported", date_checked=r["date_checked"])
    for r in assets:
        aid = f"ASSET:{slug(r['name'])}"
        nodes.setdefault(aid, {"id": aid, "type": "asset", "name": r["name"], "asset_type": r["asset_type"],
                               "identifier": r["identifier"], "url": r["source_url"], "asset_status": r["status"]})
        add("C", source=f"HGNC_SYMBOL:{r['gene'].upper()}", target=aid, relation="has_asset", evidence_type="manual",
            source_db="curated assets.csv", references=[r["source_url"]] if r["source_url"] else [], confidence=0.8,
            status="supported", date_checked=r["date_checked"])
    if pg or assets:
        sources.append({"name": "curated CSVs", "retrieved_at": TODAY})

    # --- validate (fails loudly) ---
    ids = [e["id"] for e in edges]
    assert len(ids) == len(set(ids)), "duplicate edge ids"
    for e in edges:
        Edge(**e)
        assert e["source"] in nodes and e["target"] in nodes, f"dangling edge {e['id']}"
    for n in nodes.values():
        Node(**n)
    graph = {"meta": {"built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                      "sources": sources, "trial_stats": trial_stats,
                      "mechanism_stats": mech["stats"] if mech else None,
                      "curated_counts": {"patient_groups": len(pg), "assets": len(assets)},
                      "core": CORE, "counterexamples": COUNTEREXAMPLES},
             "nodes": list(nodes.values()), "edges": edges, "clusters": json.loads((GRAPH / "clusters.json").read_text()),
             "explanations": {}}
    return graph


def main():
    g = build()
    (GRAPH / "graph.json").write_text(json.dumps(g))
    web = ROOT / "web" / "public" / "data"
    web.mkdir(parents=True, exist_ok=True)
    shutil.copy(GRAPH / "graph.json", web / "graph.json")
    ec = Counter(e["evidence_type"] for e in g["edges"])
    print(f"nodes={len(g['nodes'])} edges={len(g['edges'])} by_evidence_type={dict(ec)} "
          f"by_type={dict(Counter(n['type'] for n in g['nodes']))}")


if __name__ == "__main__":
    main()
