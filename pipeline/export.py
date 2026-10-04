"""WP1.4: merge base graph + trials + mechanisms + curated CSVs -> data/graph/graph.json (+ web copy). Validates schema."""
import datetime, json, re, shutil, sys
from collections import Counter
from common import GRAPH, ROOT
from config import ALL, CORE, COUNTEREXAMPLES
import curated, mech
from spans import norm as mech_norm
from gaps import build_gaps
import search_index
from models import Edge, Node

TODAY = datetime.date.today().isoformat()
SHARE_MECH_MIN = 0.5  # fixed a priori


def jl(name):
    p = GRAPH / name
    return [json.loads(l) for l in p.open()] if p.exists() else []


def jload(name):
    p = GRAPH / name
    return json.loads(p.read_text()) if p.exists() else None


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def mondo_definitions(ids):
    """MONDO `def:` text + its first xref URL for the slice diseases (offline, from data/raw/mondo.obo; skipped if absent)."""
    p, out, cur = ROOT / "data" / "raw" / "mondo.obo", {}, None
    if not p.exists():
        return out
    for line in p.open():
        if line.startswith("id: "):
            cur = line[4:].strip() if line[4:].strip() in ids else None
        elif cur and line.startswith("def: "):
            m = re.match(r'def: "(.*)" \[(.*)\]', line.strip())
            if m:
                url = next((u for u in m.group(2).split(", ") if u.startswith("http")), None)
                out[cur] = {"definition": m.group(1).replace('\\"', '"'), "definition_url": url}
    return out


def is_broad_registry(ident, name, studies):
    """Broad multi-condition registries (more than 10 conditions, e.g. Simons Searchlight NCT01238250)."""
    s = studies.get(ident, {}) if studies else {}
    conds = s.get("conditions", [])
    if len(conds) > 10 or ident == "NCT01238250" or "Simons Searchlight" in (name or ""):
        return True, len(conds) or 187
    return False, len(conds)


def matching_diseases_for_study(s, gene, nodes):
    """A study links to a disease only if it covers that condition (DEE/encephalopathy vs benign/self-limited).
    EMBOLD (NCT05818553) enrolls DEE only -> SCN2A DEE11 + SCN8A DEE13, never BFIS3/BFIS5.
    If a record does not specify, link only the core (severe) form, labeled 'condition not specified'."""
    text = " ".join([s.get("title", ""), *s.get("conditions", [])]).lower()
    is_benign = bool(re.search(r"\b(benign|self-limited|neonatal seizures)\b", text))
    is_dee = bool(re.search(r"\b(developmental and epileptic encephalopath|encephalopath|dee|early infantile|severe)\b", text))
    gene_dids = [d for d, g in ALL.items() if g == gene and d in nodes]
    if len(gene_dids) <= 1:
        return [(gene_dids[0], False)] if gene_dids else []
    benign_dids = [d for d in gene_dids if d in COUNTEREXAMPLES]
    severe_dids = [d for d in gene_dids if d not in COUNTEREXAMPLES]
    if is_benign and not is_dee:
        return [(d, False) for d in benign_dids]
    if is_dee and not is_benign:
        return [(d, False) for d in severe_dids]
    return [(d, True) for d in severe_dids]


def agreement_stats(pairs):
    """Inter-reviewer agreement over (first, second) verdict pairs: percent agreement and Cohen's kappa (None when undefined)."""
    n = len(pairs)
    out = {"n_double_reviewed": n, "agree": sum(a == b for a, b in pairs), "percent_agreement": round(sum(a == b for a, b in pairs) / n, 3) if n else None,
           "cohens_kappa": None}
    if n >= 2:
        po = out["agree"] / n
        pe = sum((sum(a == c for a, _ in pairs) / n) * (sum(b == c for _, b in pairs) / n) for c in ("correct", "partial", "incorrect"))
        out["cohens_kappa"] = round((po - pe) / (1 - pe), 3) if pe < 1 else None
    return out


def build():
    nodes = {n["id"]: n for n in jl("nodes.jsonl")}
    defs = mondo_definitions({n.get("mondo") for n in nodes.values() if n.get("type") == "disease"})
    for n in nodes.values():
        if n.get("type") == "disease" and n.get("mondo") in defs:
            n.update(defs[n["mondo"]], definition_source="MONDO")
    edges = jl("edges.jsonl")
    for e in edges:  # base edges: curated -> supported; computed -> hypothesis (rule 3)
        e["status"] = "hypothesis" if e["evidence_type"] == "computed" else "supported"
    gene_diseases = {}
    for d, g in ALL.items():
        if d in nodes and d not in COUNTEREXAMPLES:
            gene_diseases.setdefault(g, []).append(d)
    sources = [{"name": "HPO + MONDO", "retrieved_at": (GRAPH.parent / "raw" / "RETRIEVED_AT").read_text().strip()
                if (GRAPH.parent / "raw" / "RETRIEVED_AT").exists() else TODAY}]
    counter = {"T": 0, "S": 0, "C": 0, "A": 0, "Y": 0}

    def add(prefix, **kw):
        counter[prefix] += 1
        e = {"id": f"{prefix}{counter[prefix]:05d}", "retrieved_at": TODAY, **kw}
        edges.append(e)

    # --- trials (ClinicalTrials.gov) ---
    tr = jload("trials.json")
    trial_stats, trial_hits = None, {}
    if tr:
        sources.append({"name": "ClinicalTrials.gov API v2", "retrieved_at": tr["retrieved_at"]})
        studies = {s["nct"]: s for s in tr["studies"]}
        used = set()
        for l in tr["links"]:
            if not l["gene_in_record"]:
                continue  # free-text hit only; not asserted
            s = studies[l["nct"]]
            used.add(l["nct"])
            broad, n_conds = is_broad_registry(s["nct"], s["title"], studies)
            nodes[s["nct"]] = {"id": s["nct"], "type": "study", "name": s["title"], "status": s["status"],
                               "phases": s["phases"], "conditions": s["conditions"],
                               "broad_registry": broad, "broad_registry_conditions": n_conds,
                               "url": f"https://clinicaltrials.gov/study/{s['nct']}"}
            for d, unspec in matching_diseases_for_study(s, l["gene"], nodes):
                note = f"Registry record names {l['gene']} in title/conditions/keywords; confirm the disease/variant is in scope."
                if unspec:
                    note += " Condition not specified in record: linked to core severe form."
                add("T", source=s["nct"], target=d, relation="studied_in", evidence_type="curated",
                    source_db="ClinicalTrials.gov API v2", references=[s["nct"]], confidence=0.6, status="supported",
                    condition_unspecified=unspec, note=note)
        trial_stats = {"studies_fetched": len(studies), "studies_in_graph": len(used)}
        trial_hits = {}
        for l in tr["links"]:
            trial_hits[l["gene"]] = trial_hits.get(l["gene"], 0) + 1

    # --- mechanisms (LLM, span-verified); stable claim ids ---
    mech_json = jload("mechanisms.json")
    claims = mech.load_claims() if mech_json else []
    idx = mech.disease_index() if claims else {}
    spec = mech.specific_claims(claims, idx, gene_level=True)
    if mech_json:
        sources.append({"name": f"PubMed + OpenAI ({mech_json['model']})", "retrieved_at": mech_json["retrieved_at"]})
        for c in claims:
            mid = f"MECH:{c['variant_effect']}|{c['molecular_function']}"
            nodes.setdefault(mid, {"id": mid, "type": "mechanism",
                                   "name": f"{c['variant_effect'].replace('_', ' ')} · {c['molecular_function'].replace('_', ' ')}",
                                   "variant_effect": c["variant_effect"], "molecular_function": c["molecular_function"]})
            nodes.setdefault(f"PMID:{c['pmid']}", {"id": f"PMID:{c['pmid']}", "type": "publication", "name": c["title"],
                                                   "year": c["year"], "url": f"https://pubmed.ncbi.nlm.nih.gov/{c['pmid']}/"})
            edges.append({"id": mech.claim_id(c), "retrieved_at": TODAY, "source": f"HGNC_SYMBOL:{c['gene'].upper()}", "target": mid,
                          "relation": "has_variant_effect", "evidence_type": "llm_extracted",
                          "source_db": f"PubMed abstract + {mech_json['model']}", "references": [f"PMID:{c['pmid']}"],
                          "confidence": c["confidence"], "span_mentions_gene": c["span_mentions_gene"], "disease_context": c["disease_context"],
                          "status": "supported", "quoted_span": c["quoted_span"], "population": c["population"],
                          "linked_phenotype_or_disease": c["linked_phenotype_or_disease"], "contradicts": [],
                          "entailment": c["entailment"], "entailment_rationale": c.get("entailment_rationale", ""),
                          "extracted_variant_effect": c["extracted_variant_effect"], "extracted_population": c["extracted_population"],
                          "review": c.get("review"), "human_demoted": bool(c.get("human_demoted"))})
    by_id = {e["id"]: e for e in edges}
    # --- WP2.2 contradictions (disease level); "mixed" is a finding, not a contradiction ---
    findings = mech.contradictions(claims, idx) if claims else []
    for f in findings:
        if f["kind"] == "contradicted":
            for mine, other in ((f["reduced"], f["increased"]), (f["increased"], f["reduced"])):
                for i in mine:
                    by_id[i]["status"] = "contradicted"
                    by_id[i]["contradicts"] = other
        else:
            for i in f["reduced"] + f["increased"]:
                by_id[i]["note"] = "Mixed: reduced- and increased-function claims are tied to different phenotypes (a finding, not a contradiction)."
    # --- computed shares_mechanism_with (hypothesis) from disease-level profiles ---
    comb = json.loads((GRAPH / "similarity_combined.json").read_text()) if (GRAPH / "similarity_combined.json").exists() else []
    for p in comb:
        if p["mechanism_available"] and p["mechanism"] >= SHARE_MECH_MIN:
            keys = set(p["shared_mechanism_keys"])
            sup = [c for d in (p["a"], p["b"]) for c in mech.directional(spec.get(d, []))
                   if f"E:{c['variant_effect']}" in keys or f"F:{c['molecular_function']}" in keys]
            add("S", source=p["a"], target=p["b"], relation="shares_mechanism_with", evidence_type="computed",
                source_db="weighted Jaccard over disease-level mechanism profiles", references=sorted({f"PMID:{c['pmid']}" for c in sup}),
                confidence=round(p["mechanism"], 3), status="hypothesis", supporting_edge_ids=sorted({mech.claim_id(c) for c in sup}),
                shared_mechanisms=sorted(keys),
                method_note="Computed from literature-derived claims; a hypothesis of shared mechanism, not established evidence.")

    # --- investigators (WP3.2): authored edges; identity confidence depends on ORCID / affiliation match ---
    net = jload("network.json")
    if net:
        sources.append({"name": "PubMed efetch author lists", "retrieved_at": TODAY})
        conf = {"orcid": (0.95, "supported"), "affiliation": (0.8, "supported"), "possible": (0.4, "hypothesis")}
        for iv in net["investigators"]:
            nodes[iv["id"]] = {"id": iv["id"], "type": "investigator", "name": iv["name"], "match_level": iv["match_level"],
                               "possible_match": iv["match_level"] == "possible", "orcid": iv["orcid"], "genes": iv["genes"],
                               "affiliation_example": iv["affiliation_example"]}
            for pm in iv["pmids"]:
                if f"PMID:{pm}" in nodes:
                    c, st = conf[iv["match_level"]]
                    add("A", source=iv["id"], target=f"PMID:{pm}", relation="authored", evidence_type="curated",
                        source_db="PubMed efetch author list (lead author)", references=[f"PMID:{pm}"], confidence=c, status=st,
                        match_level=iv["match_level"], note=("Possible match: same name key on papers about different genes, no ORCID or "
                                                             "affiliation match; may be different people.") if iv["match_level"] == "possible" else "")

    # --- curated CSVs (missing => empty) ---
    slice_genes = set(ALL.values())
    skipped = []
    def ok(name):
        keep, bad = curated.usable(name, curated.load(name), slice_genes)
        for r, why in bad:
            skipped.append(f"{name}: {why}")
            print(f"WARNING: {name} row skipped ({why})")
        return keep
    pg, assets = ok("patient_groups"), ok("assets")
    yes = lambda r: r.get("verified", "").strip().lower() == "yes"   # protocol: only verified=yes rows count as human-verified
    all_gene_diseases = {}                       # patient groups serve EVERY disease of their gene, benign forms included
    for d, g in ALL.items():
        if d in nodes:
            all_gene_diseases.setdefault(g, []).append(d)
    org_genes = {}
    for r in pg:
        oid = f"ORG:{slug(r['organization_name'])}"
        org_genes.setdefault(oid, set()).add(r["gene"].upper())
        nodes.setdefault(oid, {"id": oid, "type": "patient_org", "name": r["organization_name"], "url": r["url"],
                               "verified": yes(r), "country": r["country"], "has_registry": r["has_registry"].lower() in ("1", "true", "yes"),
                               "registry_url": r["registry_url"]})
        for d in all_gene_diseases.get(r["gene"].upper(), []):
            add("C", source=oid, target=d, relation="serves", evidence_type="manual", source_db="curated patient_groups.csv",
                references=[r["url"]] if r["url"] else [], confidence=0.8 if yes(r) else 0.4, status="supported" if yes(r) else "hypothesis",
                date_checked=r["date_checked"], verified=yes(r), verified_by=r.get("verified_by", ""), verified_at=r.get("verified_at", ""),
                gene=r["gene"].upper(), note="" if yes(r) else "Not yet verified by a human reviewer.")
    for oid, gs in org_genes.items():
        nodes[oid]["genes"] = sorted(gs)
    # assets: one node per study/registry identifier (falls back to the name); `verified` is the ONLY source of truth for their status
    asset_rows = {}
    for r in assets:
        key = r["identifier"].strip() or slug(r["name"])
        aid = f"ASSET:{key}"
        ident = r["identifier"].strip()
        broad, n_conds = is_broad_registry(ident, r["name"], studies)
        nodes.setdefault(aid, {"id": aid, "type": "asset", "name": r["name"], "asset_type": r["asset_type"],
                               "identifier": r["identifier"], "url": r["source_url"], "asset_status": r["status"],
                               "broad_registry": broad, "broad_registry_conditions": n_conds})
        asset_rows.setdefault(aid, []).append(r)
        add("C", source=f"HGNC_SYMBOL:{r['gene'].upper()}", target=aid, relation="has_asset", evidence_type="manual",
            source_db="curated assets.csv", references=[r["source_url"]] if r["source_url"] else [], confidence=0.8 if yes(r) else 0.4,
            status="supported" if yes(r) else "hypothesis", date_checked=r["date_checked"], verified=yes(r), verified_by=r.get("verified_by", ""),
            verified_at=r.get("verified_at", ""), gene=r["gene"].upper(), note="" if yes(r) else "Not yet verified by a human reviewer.")
    for aid, rows in asset_rows.items():
        nodes[aid]["verified"] = all(yes(r) for r in rows)
        nodes[aid]["genes"] = sorted({r["gene"].upper() for r in rows})
    # "shares a study": one curated asset with the same identifier serves both genes -> link their (non-benign) diseases.
    # supported only if the asset rows of BOTH genes are verified=yes; otherwise pending verification.
    # Broad multi-condition registries (>10 conditions, e.g. Simons Searchlight NCT01238250) must NOT create shares-a-study links!
    import itertools
    for aid, rows in asset_rows.items():
        ident = nodes[aid].get("identifier", "").strip()
        if not ident:
            continue
        if nodes[aid].get("broad_registry"):
            continue
        by_gene = {}
        for r in rows:
            by_gene.setdefault(r["gene"].upper(), []).append(r)
        for ga, gb in itertools.combinations(sorted(by_gene), 2):
            ver = all(yes(r) for r in by_gene[ga] + by_gene[gb])
            ids_ = [e["id"] for e in edges if e["relation"] == "has_asset" and e["target"] == aid and e.get("gene") in (ga, gb)]
            s_obj = studies.get(ident, {"title": nodes[aid]["name"], "conditions": []})
            d_list_a = [d for d, _ in matching_diseases_for_study(s_obj, ga, nodes)]
            d_list_b = [d for d, _ in matching_diseases_for_study(s_obj, gb, nodes)]
            for da in d_list_a:
                for db in d_list_b:
                    add("Y", source=da, target=db, relation="shares_study_with", evidence_type="manual", source_db="curated assets.csv (same study identifier)",
                        references=[nodes[aid]["identifier"]], confidence=0.85 if ver else 0.4, status="supported" if ver else "hypothesis",
                        pending_verification=not ver, study_id=nodes[aid]["identifier"], study_name=nodes[aid]["name"], asset_id=aid,
                        supporting_edge_ids=ids_, genes=[ga, gb],
                        note="Both are included in the same study: " + nodes[aid]["name"] + ("" if ver else " (pending verification of the asset rows)."))
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
    # --- human review of the 24-claim sample (final_verdict): precision per sampling-time confidence tier, demotion check, agreement ---
    rev = mech.human_reviews()
    tier = lambda c: "0.8" if c >= 0.8 else "0.7" if c >= 0.7 else "<0.7"
    review = {t: {"sampled": 0, "reviewed": 0, "correct": 0, "partial": 0, "incorrect": 0} for t in ("0.8", "0.7", "<0.7")}
    demotion = {"n": 0, "correct": 0, "partial": 0, "incorrect": 0, "rows": []}
    pairs_two, review_rows = [], []
    for eid, r in rev.items():
        e = next((x for x in edges if x["id"] == eid), None)
        if e is None or not r["final"] or not r["parsed"]:
            continue
        e["review_verdict"] = r["final"]
        if r["first"] and r["second"]:
            pairs_two.append((r["first"], r["second"]))
        row = {"edge_id": eid, "gene": r["gene"], "final": r["final"], "effect_at_review": r["parsed"]["effect"], "tier": tier(r["parsed"]["conf"])}
        review_rows.append(row)
        if r["parsed"]["effect"] == "unclear":      # claim was already context only when sampled -> demotion check, not precision
            demotion["n"] += 1; demotion[r["final"]] += 1; demotion["rows"].append(eid)
            continue
        t = review[tier(r["parsed"]["conf"])]
        t["sampled"] += 1; t["reviewed"] += 1; t[r["final"]] += 1
    for t in review.values():
        t["precision"] = round(t["correct"] / t["reviewed"], 3) if t["reviewed"] else None
    agreement = {**agreement_stats(pairs_two), "label": "two human reviewers (Varduhi, Amin)"}
    tot = {k: sum(t[k] for t in review.values()) for k in ("sampled", "reviewed", "correct", "partial", "incorrect")}
    review_overall = {**tot, "share_reviewed": round(tot["reviewed"] / tot["sampled"], 3) if tot["sampled"] else None}
    gaps = build_gaps(nodes, edges, comb, {"claims": claims, "specific": spec, "mech_stats": mech_json["stats"] if mech_json else None,
                                           "trials": tr, "trial_hits": trial_hits, "n_orgs_file": len(pg), "n_assets_file": len(assets)})
    # --- explanations (pre-generated by explain.py): keep only those whose cited edges all still exist and were in their input ---
    ex_file = jload("explanations.json")
    explanations, ex_stale = {}, []
    if ex_file:
        all_ids = {e["id"] for e in edges}
        for did, ex in ex_file["explanations"].items():
            cited = [i for st in ex["steps"] + [ex["next_step"]] for i in st["edge_ids"]]
            if did in nodes and set(cited) <= all_ids and set(cited) <= set(ex["input_edge_ids"]):
                explanations[did] = ex
            else:
                ex_stale.append(did)
    graph = {"meta": {"built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                      "sources": sources, "trial_stats": trial_stats,
                      "mechanism_stats": mech_json["stats"] if mech_json else None,
                      "review_precision_by_tier": review, "pairs": comb, "contradiction_findings": findings, "gaps": gaps,
                      "cluster_report": json.loads((GRAPH / "cluster_report.json").read_text()),
                      "curated_skipped": skipped, "share_mechanism_min_ui": SHARE_MECH_MIN, "explanation_stats": {**(ex_file["stats"] if ex_file else {}), "stale_dropped": ex_stale}, "network_stats": net["stats"] if net else None, "share_mechanism_min": SHARE_MECH_MIN,
                      "confidence_rule": "LLM claims: 0.8 if the quoted span names the gene and the span-check says it describes human subjects; 0.7 if it names the gene but describes cells, animals or no stated population; 0.5 if the span does not name the gene. A second check sees only the span: entailment 'partial' lowers confidence by 0.2; 'no' sets the variant effect to unclear (context only, at most 0.4, excluded from similarity and profiles).",
                      "entailment_stats": (jload("entailment.json") or {}).get("stats"),
                      "review_overall": review_overall, "review_agreement": agreement, "review_demotion_check": demotion,
                      "curated_counts": {"patient_groups": len(pg), "assets": len(assets)},
                      "core": CORE, "counterexamples": COUNTEREXAMPLES},
             "nodes": list(nodes.values()), "edges": edges, "clusters": json.loads((GRAPH / "clusters.json").read_text()),
             "explanations": explanations}
    return graph


def main():
    g = build()
    (GRAPH / "graph.json").write_text(json.dumps(g))
    web = ROOT / "web" / "public" / "data"
    web.mkdir(parents=True, exist_ok=True)
    shutil.copy(GRAPH / "graph.json", web / "graph.json")
    nm = {n["id"]: n for n in g["nodes"]}
    def ref_title(r):
        n = nm.get(r)
        return (n or {}).get("name") or ""
    lite = {}
    for e in g["edges"]:
        lite[e["id"]] = {k: v for k, v in {
            "id": e["id"], "relation": e["relation"], "source": nm[e["source"]].get("name"), "target": nm[e["target"]].get("name"),
            "evidence_type": e["evidence_type"], "status": e["status"], "confidence": e["confidence"], "source_db": e["source_db"],
            "retrieved_at": e["retrieved_at"], "references": e["references"], "ref_titles": {r: ref_title(r) for r in e["references"] if ref_title(r)},
            "quoted_span": e.get("quoted_span"), "population": e.get("population"), "entailment": e.get("entailment"),
            "entailment_rationale": e.get("entailment_rationale"), "extracted_variant_effect": e.get("extracted_variant_effect"),
            "variant_effect": nm[e["target"]].get("variant_effect") if e["relation"] == "has_variant_effect" else None,
            "disease_context": e.get("disease_context"), "contradicts": e.get("contradicts") or None,
            "note": e.get("note") or e.get("method_note") or None, "review_verdict": e.get("review_verdict"),
            "match_level": e.get("match_level"), "review": e.get("review"), "human_demoted": e.get("human_demoted") or None, "pending_verification": e.get("pending_verification") or None, "study_name": e.get("study_name"), "verified": e.get("verified"), "shared_phenotypes": [p["name"] for p in e.get("shared_phenotypes", [])[:5]] or None,
            "shared_mechanisms": e.get("shared_mechanisms"), "frequency": e.get("frequency") or None}.items() if v not in (None, "", [])}
    (web / "edges.json").write_text(json.dumps(lite, separators=(",", ":")))
    items = search_index.build({n["id"]: n for n in g["nodes"]}, g["edges"], None)
    (web / "search.json").write_text(json.dumps(items, separators=(",", ":")))
    print(f"search index: {len(items)} entries")
    ec = Counter(e["evidence_type"] for e in g["edges"])
    print(f"nodes={len(g['nodes'])} edges={len(g['edges'])} by_evidence_type={dict(ec)} "
          f"by_type={dict(Counter(n['type'] for n in g['nodes']))}")


if __name__ == "__main__":
    main()
