"""WP2.5 gap engine: per disease, sources searched + counts, route status (supported | hypothesis | none), missing evidence and a
suggested question. Deterministic templates only; no LLM, nothing invented.
Each route has four segments (own community, link to the related disease, related community, shared asset); the overall label is the weakest."""
from config import ALL
import mech


RANK = {"supported": 3, "pending": 2, "hypothesis": 1, "missing": 0}


def build_gaps(nodes, edges, pairs, meta_in):
    by_rel = {}
    for e in edges:
        by_rel.setdefault(e["relation"], []).append(e)
    diseases = [n for n in nodes.values() if n["type"] == "disease"]
    gene_of = {e["target"]: e["source"] for e in by_rel["causes"]}
    trials_by_d, orgs_by_d = {}, {}
    org_src, asset_src, serve_edge, asset_edge = {}, {}, {}, {}
    unver = {"orgs": 0, "assets": 0}
    for e in by_rel.get("studied_in", []):
        trials_by_d.setdefault(e["target"], []).append(e["id"])
    for e in by_rel.get("serves", []):
        orgs_by_d.setdefault(e["target"], []).append(e["id"])
        if e["status"] == "supported":   # only verified rows can create a supported connection
            org_src.setdefault(e["target"], set()).add(e["source"]); serve_edge[(e["target"], e["source"])] = e["id"]
        else:
            unver["orgs"] += 1
    assets_by_g = {}
    for e in by_rel.get("has_asset", []):
        assets_by_g.setdefault(e["source"], []).append(e["id"])
        if e["status"] == "supported":
            asset_src.setdefault(e["source"], set()).add(e["target"]); asset_edge[(e["source"], e["target"])] = e["id"]
        else:
            unver["assets"] += 1
    def comm_status(d):
        """Own / related community segment: a verified patient group serves this disease -> supported; only unverified rows -> pending."""
        es = [e for e in by_rel.get("serves", []) if e["target"] == d]
        return "supported" if any(e["status"] == "supported" for e in es) else "pending" if es else "missing"
    claims = meta_in["claims"]
    spec = meta_in["specific"]
    cls = lambda e: "reduced" if e in mech.REDUCED else "increased" if e == "gain_of_function" else None
    dom = {n["id"]: mech.dominant_effect(spec.get(n["id"], [])) for n in diseases}
    opposite = lambda a, b: bool(cls(dom[a]) and cls(dom[b]) and cls(dom[a]) != cls(dom[b]))   # e.g. SCN1A loss vs SCN8A gain of function
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
            {"source": "NIH RePORTER", "searched": False, "count": 0, "unit": "Not included in this prototype"},
        ]
        rel = []
        for p in pairs:
            if did in (p["a"], p["b"]):
                o = p["b"] if p["a"] == did else p["a"]
                rel.append((p["combined"], o, p))
        rel.sort(key=lambda x: -x[0])
        comb_of = {o: c for c, o, _ in rel}
        study_edges = {}                     # other disease -> shares_study_with edges
        for e in by_rel.get("shares_study_with", []):
            if did in (e["source"], e["target"]):
                study_edges.setdefault(e["target"] if e["source"] == did else e["source"], []).append(e)
        own_status = comm_status(did)

        def route(comb, o):
            same_gene = ALL[o] == gene
            ids = [e["id"] for e in by_rel.get("phenotypically_similar_to", []) if {e["source"], e["target"]} == {did, o}]
            ids += [e["id"] for e in by_rel.get("shares_mechanism_with", []) if {e["source"], e["target"]} == {did, o}]
            if same_gene:
                ids += [e["id"] for e in by_rel["causes"] if e["target"] in (did, o)]
            # a group (or asset) shared by two diseases of the SAME gene is trivial, not a cross-gene route
            shared_orgs = set() if same_gene else org_src.get(did, set()) & org_src.get(o, set())
            shared_assets = set() if same_gene else asset_src.get(gid, set()) & asset_src.get(gene_of[o], set())
            studies = [{"id": e["study_id"], "name": e["study_name"], "status": "supported" if e["status"] == "supported" else "pending", "edge_id": e["id"]}
                       for e in study_edges.get(o, [])]
            if studies:                       # curated, same study identifier serves both genes
                kind = "shares_study"
                link = "supported" if any(x["status"] == "supported" for x in studies) else "pending"
                ids = [x["edge_id"] for x in studies] + ids
                asset_seg = link
            elif shared_orgs or shared_assets:
                kind = "shared_patient_group" if shared_orgs else "shared_asset"
                link = asset_seg = "supported"
                ids += [serve_edge[(x, g)] for x in (did, o) for g in shared_orgs] + [asset_edge[(x, a)] for x in (gid, gene_of[o]) for a in shared_assets if (x, a) in asset_edge]
            else:  # same gene or computed similarity: a hypothesis, not a route (lead decision)
                kind, link, asset_seg = ("same_gene" if same_gene else "computed"), "hypothesis", "missing"
            opp = (not same_gene) and opposite(did, o)    # never recommend a community across opposite mechanisms
            leads = {"trials": trials_by_d.get(o, []), "patient_groups": [] if opp else orgs_by_d.get(o, []),
                     "assets": assets_by_g.get(gene_of[o], []) if not same_gene else []}
            seg = {"own_community": own_status, "link": link, "related_community": "missing" if opp else comm_status(o), "shared_asset": asset_seg}
            overall = min(seg.values(), key=lambda v: RANK[v])   # the weakest segment
            return {"to": o, "combined_similarity": round(comb, 3), "connection": kind, "connection_status": "supported" if link == "supported" else "hypothesis",
                    "connection_pending": link == "pending", "opposite_mechanisms": opp, "dominant": {"here": dom[did], "there": dom[o]}, "segments": seg, "overall": overall, "studies": studies,
                    "edge_ids": ids, "leads": leads, "n_leads": sum(len(v) for v in leads.values())}
        routes, have = [], set()
        for o in sorted(study_edges, key=lambda x: -comb_of.get(x, 0)):          # shared studies rank above phenotype hypotheses
            routes.append(route(comb_of.get(o, 0.0), o)); have.add(o)
        routes.sort(key=lambda r: -RANK[r["overall"]])
        for comb, o, p in rel[:3]:
            if o not in have:
                routes.append(route(comb, o)); have.add(o)
        for comb, o, p in rel[3:]:
            if o not in have and ALL[o] != gene and (org_src.get(did, set()) & org_src.get(o, set()) or asset_src.get(gid, set()) & asset_src.get(gene_of[o], set())):
                routes.append(route(comb, o)); have.add(o)
        best = max(routes, key=lambda r: (RANK[r["overall"]], sum(RANK[v] for v in r["segments"].values())), default=None)   # ties: the route with the most solid parts
        overall = best["overall"] if best else "missing"
        segments = best["segments"] if best else {"own_community": own_status, "link": "missing", "related_community": "missing", "shared_asset": "missing"}
        status = {"supported": "supported", "pending": "hypothesis", "hypothesis": "hypothesis", "missing": "none"}[overall]   # compat with map colours
        missing = []
        if len(dirc) < mech.MIN_DIRECTIONAL:
            missing.append(f"Disease-level mechanism evidence: {len(dirc)} directional claim(s) for this disease (need {mech.MIN_DIRECTIONAL}).")
        ver_orgs = [i for i in orgs_by_d.get(did, []) if (did, next(e["source"] for e in by_rel["serves"] if e["id"] == i)) in serve_edge]
        ver_assets = [i for i in assets_by_g.get(gid, []) if (gid, next(e["target"] for e in by_rel["has_asset"] if e["id"] == i)) in asset_edge]
        if not ver_orgs:
            missing.append(f"No verified patient group or registry on file for {gene}" + (f" ({len(orgs_by_d.get(did, []))} curated row(s) not yet verified)." if orgs_by_d.get(did) else "."))
        if not ver_assets:
            missing.append(f"No verified shared asset (registry, natural-history study, biobank, model) for {gene}" + (f" ({len(assets_by_g.get(gid, []))} curated row(s) not yet verified)." if assets_by_g.get(gid) else "."))
        if not trials_by_d.get(did):
            missing.append(f"No ClinicalTrials.gov record naming {gene} linked to this disease.")
        if routes and all(r["connection_status"] == "hypothesis" for r in routes):
            missing.append("No verified shared study, patient group or asset links this disease to a related disease; the links are computed similarity or same-gene only (hypothesis)." if not any(r["connection"] == "shares_study" for r in routes)
                           else "A shared study links this disease to a related one but its asset rows are not verified yet (pending verification).")
        top = next((r for r in routes if r["connection"] in ("computed", "same_gene")), None)
        if top:
            on = nodes[top["to"]]["name"]
            q = f"Do {d['name']} and {on} share the same variant effect in human patients? Needs expert review of the cited PMIDs."
        else:
            q = f"Which patient groups, registries or natural-history studies exist for {gene}-related disease? None are curated yet."
        out[did] = {"route_status": status, "route_overall": overall, "route_segments": segments, "sources": sources, "routes": routes, "missing": missing, "suggested_question": q}
    return out
