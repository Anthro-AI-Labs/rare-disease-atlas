"""WP2.1: combined similarity = 0.6 x phenotype (IC-weighted Jaccard) + 0.4 x mechanism overlap -> kNN(k=3) -> Louvain,
stability over 30 seeds. If either disease lacks a mechanism profile (< MIN_DIRECTIONAL directional disease-level claims)
the pair uses phenotype similarity alone and is marked mechanism_available=false. Weights are fixed a priori; never tuned.
Counterexample pairs are classified from disease-level evidence (see pair_status)."""
import collections, itertools, json
import networkx as nx
from common import GRAPH
from config import ALL, CORE, COUNTEREXAMPLES
import mech

W_PHENO, W_MECH, K, SEEDS, STABLE_MIN = 0.6, 0.4, 3, 30, 0.8


def main():
    nodes = {n["id"]: n for n in map(json.loads, (GRAPH / "nodes.jsonl").open())}
    pheno = json.loads((GRAPH / "similarity.json").read_text())
    claims = mech.load_claims()
    by_d = mech.specific_claims(claims, mech.disease_index(), gene_level=True)
    prof = {d: mech.profile(cs) for d, cs in by_d.items()}
    dis = sorted(d for d in ALL if d in nodes)
    pairs = {}
    for r in pheno:
        a, b = r["a"], r["b"]
        pa, pb = prof.get(a), prof.get(b)
        m = mech.overlap(pa, pb) if pa and pb else None
        comb = W_PHENO * r["similarity"] + W_MECH * m if m is not None else r["similarity"]
        shared = sorted(set(pa) & set(pb)) if pa and pb else []
        pairs[frozenset((a, b))] = {"a": a, "b": b, "phenotype": r["similarity"], "mechanism": None if m is None else round(m, 4),
                                    "mechanism_available": m is not None, "combined": round(comb, 4),
                                    "shared_phenotypes": r["shared_phenotypes"], "shared_mechanism_keys": shared}
    sim = lambda x, y: pairs[frozenset((x, y))]["combined"]
    knn = nx.Graph(); knn.add_nodes_from(dis)
    for d in dis:
        for o in sorted((x for x in dis if x != d), key=lambda x: -sim(d, x))[:K]:
            knn.add_edge(d, o, weight=sim(d, o))
    runs = [nx.community.louvain_communities(knn, weight="weight", seed=s) for s in range(SEEDS)]
    co = collections.Counter()
    for comms_s in runs:
        for c in comms_s:
            for x, y in itertools.combinations(sorted(c), 2): co[(x, y)] += 1
    co_freq = lambda x, y: co[tuple(sorted((x, y)))] / len(runs)
    comms = runs[0]
    stab = {}
    for c in comms:
        for d in c:
            o = [x for x in c if x != d]
            stab[d] = round(sum(co_freq(d, x) for x in o) / len(o), 3) if o else 1.0
    clusters = [{"cluster": i, "members": [{"id": d, "name": nodes[d]["name"], "role": nodes[d]["role"], "gene": ALL[d],
                                             "stability": stab[d], "uncertain": stab[d] < STABLE_MIN} for d in sorted(c)]}
                for i, c in enumerate(comms)]
    member = {m["id"]: m for c in clusters for m in c["members"]}
    cl_of = {m["id"]: c["cluster"] for c in clusters for m in c["members"]}
    out_pairs = []
    for c in COUNTEREXAMPLES:
        for d in CORE:
            if ALL[c] != ALL[d]:
                continue
            ev_c, ev_d = by_d.get(c, []), by_d.get(d, [])
            dom_c, dom_d = mech.dominant_effect(ev_c), mech.dominant_effect(ev_d)
            together = cl_of[c] == cl_of[d]
            if not together:
                status = "separated"
                if dom_c and dom_d and dom_c == dom_d:
                    status_note = f"clustering separates them although both have dominant {dom_c}: severity, not mechanism, may differ"
                else:
                    status_note = ""
            elif dom_c and dom_d and dom_c == dom_d:
                status, status_note = "same mechanism, different severity", ""
            else:
                status, status_note = "uncertain membership", ""
            reason = (f"disease-level evidence: benign={len(mech.directional(ev_c))} directional claims (dominant {dom_c}), "
                      f"severe={len(mech.directional(ev_d))} (dominant {dom_d}); minimum {mech.MIN_DIRECTIONAL} each to compare.")
            out_pairs.append({"counterexample": c, "core": d, "gene": ALL[c], "same_cluster_freq": round(co_freq(c, d), 3),
                              "same_cluster_reference": together, "status": status, "evidence_note": reason + (" " + status_note if status_note else ""),
                              "claims_benign": len(ev_c), "claims_severe": len(ev_d),
                              "directional_benign": len(mech.directional(ev_c)), "directional_severe": len(mech.directional(ev_d)),
                              "dominant_benign": dom_c, "dominant_severe": dom_d})
            if status == "uncertain membership":
                for k in (c, d):
                    member[k]["uncertain"] = True
                    member[k]["uncertain_reason"] = ("Same-gene benign/severe pair co-clusters but disease-level evidence does not show the same "
                                                     "variant effect (" + reason + ")")
            elif status.startswith("same mechanism"):
                for k in (c, d):
                    member[k]["note"] = "Same-gene benign/severe pair with the same dominant variant effect: same mechanism, different severity."
    report = {"method": f"{W_PHENO}*phenotype + {W_MECH}*mechanism, kNN(k={K}) + Louvain", "seeds": SEEDS, "stable_min": STABLE_MIN,
              "min_directional_claims": mech.MIN_DIRECTIONAL,
              "mean_stability": round(sum(stab.values()) / len(stab), 3),
              "n_uncertain": sum(m["uncertain"] for m in member.values()),
              "n_pairs_with_mechanism": sum(p["mechanism_available"] for p in pairs.values()), "n_pairs": len(pairs),
              "diseases_with_profile": sorted(d for d, p in prof.items() if p), "counterexample_pairs": out_pairs}
    (GRAPH / "clusters.json").write_text(json.dumps(clusters, indent=2))
    (GRAPH / "cluster_report.json").write_text(json.dumps(report, indent=2))
    (GRAPH / "similarity_combined.json").write_text(json.dumps(list(pairs.values())))
    for c in clusters:
        print(f"Cluster {c['cluster']}: " + "; ".join(f"{m['gene']}{'*' if m['role']=='counterexample' else ''}(stab {m['stability']}{',UNC' if m['uncertain'] else ''})" for m in c["members"]))
    print({k: v for k, v in report.items() if k not in ("counterexample_pairs", "diseases_with_profile")})
    for p in out_pairs:
        print(p["gene"], p["status"], f"freq={p['same_cluster_freq']}", p["evidence_note"])


if __name__ == "__main__":
    main()
