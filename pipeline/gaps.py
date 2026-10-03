"""WP2.5 gap engine: per disease, sources searched + counts, route status (supported | hypothesis | none), missing evidence and a
suggested question. Deterministic templates only; no LLM, nothing invented."""
from config import ALL
import mech


def build_gaps(nodes, edges, pairs, meta_in):
    by_rel = {}
    for e in edges:
        by_rel.setdefault(e["relation"], []).append(e)
    diseases = [n for n in nodes.values() if n["type"] == "disease"]
    gene_of = {e["target"]: e["source"] for e in by_rel["causes"]}
    trials_by_d, orgs_by_d = {}, {}
    org_src, asset_src, serve_edge, asset_edge = {}, {}, {}, {}
    for e in by_rel.get("studied_in", []):
        trials_by_d.setdefault(e["target"], []).append(e["id"])
    for e in by_rel.get("serves", []):
        orgs_by_d.setdefault(e["target"], []).append(e["id"])
        org_src.setdefault(e["target"], set()).add(e["source"]); serve_edge[(e["target"], e["source"])] = e["id"]
    assets_by_g = {}
    for e in by_rel.get("has_asset", []):
        assets_by_g.setdefault(e["source"], []).append(e["id"])
        asset_src.setdefault(e["source"], set()).add(e["target"]); asset_edge[(e["source"], e["target"])] = e["id"]
    claims = meta_in["claims"]
    spec = meta_in["specific"]
    out = {}
    for d in diseases:
        did, gene = d["id"], ALL[d["id"]]
        gid = gene_of[did]
        cs = spec.get(did, [])
        dirc = mech.directional(cs)
        gstats = (meta_in["mech_stats"] or {}).get("by_gene", {}).get(gene, {})
        sources = [
            {"source": "HPO phenotype.hpoa", "searched": True, "count": sum(1 for e in by_rel["has_phenotype"] if e["source"] == did), "unit": "phenotype annotations"},
            {"source": "PubMed (mechanism extraction)", "searched": bool(gstats), "count": gstats.get("abstracts", 0), "unit": f"abstracts searched for {gene}",
             "found": gstats.get("verified", 0), "found_unit": f"verified {gene} claims; {len(cs)} disease-specific ({len(dirc)} directional)"},
            {"source": "ClinicalTrials.gov v2", "searched": meta_in["trials"] is not None, "count": meta_in["trial_hits"].get(gene, 0),
             "unit": f"records returned for {gene}", "found": len(trials_by_d.get(did, [])), "found_unit": "naming the gene, linked to this disease"},
            {"source": "Curated patient groups", "searched": True, "count": meta_in["n_orgs_file"], "unit": "rows in patient_groups.csv", "found": len(orgs_by_d.get(did, [])), "found_unit": "for this disease"},
            {"source": "Curated assets", "searched": True, "count": meta_in["n_assets_file"], "unit": "rows in assets.csv", "found": len(assets_by_g.get(gid, [])), "found_unit": f"for {gene}"},
            {"source": "NIH RePORTER", "searched": False, "count": 0, "unit": "not searched yet (planned Phase 3)"},
        ]
        rel = []
        for p in pairs:
            if did in (p["a"], p["b"]):
                o = p["b"] if p["a"] == did else p["a"]
                rel.append((p["combined"], o, p))
        rel.sort(key=lambda x: -x[0])
        routes = []
        def route(comb, o):
            same_gene = ALL[o] == gene
            ids = [e["id"] for e in by_rel.get("phenotypically_similar_to", []) if {e["source"], e["target"]} == {did, o}]
            ids += [e["id"] for e in by_rel.get("shares_mechanism_with", []) if {e["source"], e["target"]} == {did, o}]
            if same_gene:
                ids += [e["id"] for e in by_rel["causes"] if e["target"] in (did, o)]
            shared_orgs = org_src.get(did, set()) & org_src.get(o, set())
            shared_assets = asset_src.get(gid, set()) & asset_src.get(gene_of[o], set())
            if shared_orgs or shared_assets:  # curated, manually verified shared community/asset => supported connection
                conn = "shared_patient_group" if shared_orgs else "shared_asset"
                status_c = "supported"
                ids += [serve_edge[(x, g)] for x in (did, o) for g in shared_orgs] + [asset_edge[(x, a)] for x in (gid, gene_of[o]) for a in shared_assets if (x, a) in asset_edge]
            else:  # same gene is a curated fact but not evidence of a shared route (lead decision): hypothesis
                conn, status_c = ("same_gene" if same_gene else "computed"), "hypothesis"
            leads = {"trials": trials_by_d.get(o, []), "patient_groups": orgs_by_d.get(o, []),
                     "assets": assets_by_g.get(gene_of[o], []) if not same_gene else []}
            return {"to": o, "combined_similarity": round(comb, 3), "connection": conn, "connection_status": status_c,
                    "edge_ids": ids, "leads": leads, "n_leads": sum(len(v) for v in leads.values())}
        for comb, o, p in rel[:3]:
            routes.append(route(comb, o))
        have = {r["to"] for r in routes}
        for comb, o, p in rel[3:]:
            if o not in have and (org_src.get(did, set()) & org_src.get(o, set()) or asset_src.get(gid, set()) & asset_src.get(gene_of[o], set())):
                routes.append(route(comb, o))
        if any(r["connection_status"] == "supported" and r["n_leads"] for r in routes):
            status = "supported"
        elif any(r["n_leads"] for r in routes):
            status = "hypothesis"
        else:
            status = "none"
        missing = []
        if len(dirc) < mech.MIN_DIRECTIONAL:
            missing.append(f"Disease-level mechanism evidence: {len(dirc)} directional claim(s) for this disease (need {mech.MIN_DIRECTIONAL}).")
        if not orgs_by_d.get(did):
            missing.append(f"No curated patient group or registry on file for {gene}.")
        if not assets_by_g.get(gid):
            missing.append(f"No curated shared asset (registry, natural-history study, biobank, model) for {gene}.")
        if not trials_by_d.get(did):
            missing.append(f"No ClinicalTrials.gov record naming {gene} linked to this disease.")
        if routes and all(r["connection_status"] == "hypothesis" for r in routes):
            missing.append("No curated shared patient group or asset linking this disease to a related disease; links are computed similarity or same-gene only (hypothesis).")
        top = next((r for r in routes if r["connection"] in ("computed", "same_gene")), None)
        if top:
            on = nodes[top["to"]]["name"]
            q = f"Do {d['name']} and {on} share the same variant effect in human patients? Needs expert review of the cited PMIDs."
        else:
            q = f"Which patient groups, registries or natural-history studies exist for {gene}-related disease? None are curated yet."
        out[did] = {"route_status": status, "sources": sources, "routes": routes, "missing": missing, "suggested_question": q}
    return out
