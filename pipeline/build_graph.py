"""Build the base Atlas graph from free, curated sources (HPO release files, optional MONDO).

Outputs (data/graph/):
  nodes.jsonl  edges.jsonl  similarity.csv  clusters.json  report.md

Every edge carries: source_db, references, evidence_type, retrieved_at, confidence.
evidence_type is one of: curated | computed | llm_extracted | manual
"""
import csv, json, math, os, datetime, itertools, collections
import networkx as nx
from config import ALL, CORE, COUNTEREXAMPLES, CONTRAST, DROP_FREQ

RAW = "data/raw"  # paths are relative to repo root: run `python pipeline/build_graph.py`
OUT = "data/graph"
os.makedirs(OUT, exist_ok=True)
TODAY = datetime.date.today().isoformat()
PHENO_ROOT = "HP:0000118"  # Phenotypic abnormality


# ---------- HPO ontology ----------
def parse_obo(path):
    terms, cur = {}, None
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line == "[Term]":
            cur = {"parents": [], "alt": [], "obsolete": False}
        elif line.startswith("[") and line.endswith("]"):
            cur = None
        elif cur is not None and ":" in line:
            k, v = line.split(":", 1); v = v.strip()
            if k == "id":
                terms[v] = cur; cur["id"] = v
            elif k == "name": cur["name"] = v
            elif k == "is_a": cur["parents"].append(v.split(" ! ")[0].strip())
            elif k == "alt_id": cur["alt"].append(v)
            elif k == "is_obsolete" and v == "true": cur["obsolete"] = True
    alt = {a: t for t, d in terms.items() for a in d["alt"]}
    return terms, alt


terms, alt_map = parse_obo(f"{RAW}/hp.obo")
_anc_cache = {}
def ancestors(t):
    if t in _anc_cache: return _anc_cache[t]
    seen, stack = {t}, [t]
    while stack:
        for p in terms.get(stack.pop(), {}).get("parents", []):
            if p not in seen: seen.add(p); stack.append(p)
    _anc_cache[t] = seen
    return seen

def in_phenotype_branch(t):
    return PHENO_ROOT in ancestors(t) and t != PHENO_ROOT


# ---------- HPO annotations ----------
disease_name, direct = {}, collections.defaultdict(list)
with open(f"{RAW}/phenotype.hpoa", encoding="utf-8") as f:
    rows = csv.DictReader((l for l in f if not l.startswith("#")), delimiter="\t")
    for r in rows:
        if r["aspect"] != "P" or r["qualifier"] == "NOT":
            continue
        if r["frequency"] in DROP_FREQ:
            continue
        hp = alt_map.get(r["hpo_id"], r["hpo_id"])
        if hp not in terms or terms[hp]["obsolete"] or not in_phenotype_branch(hp):
            continue
        d = r["database_id"]
        disease_name[d] = r["disease_name"]
        direct[d].append({"hp": hp, "ref": r["reference"], "evidence": r["evidence"],
                          "freq": r["frequency"], "curation": r["biocuration"]})

# Information content over ALL annotated diseases (so "seizure" is cheap, rare signs are expensive)
N = len(direct)
term_count = collections.Counter()
propagated = {}
for d, anns in direct.items():
    s = set()
    for a in anns: s |= {t for t in ancestors(a["hp"]) if in_phenotype_branch(t)}
    propagated[d] = s
    term_count.update(s)
IC = {t: -math.log(c / N) for t, c in term_count.items()}


def most_specific(ts):
    """Drop terms that are ancestors of another term in the set (for readable explanations)."""
    ts = set(ts)
    return {t for t in ts if not any(t != o and t in ancestors(o) for o in ts)}


def similarity(a, b):
    A, B = propagated[a], propagated[b]
    inter, union = A & B, A | B
    s = sum(IC[t] for t in inter) / max(sum(IC[t] for t in union), 1e-9)
    shared = sorted(most_specific(inter), key=lambda t: -IC[t])[:8]
    return s, shared


# ---------- Genes ----------
gene_ids = {}
with open(f"{RAW}/genes_to_disease.txt", encoding="utf-8") as f:
    for r in csv.DictReader(f, delimiter="\t"):
        gene_ids[r["gene_symbol"]] = r["ncbi_gene_id"]


# ---------- Optional MONDO cross-references ----------
mondo_of = {}
mondo_path = f"{RAW}/mondo.obo"
if os.path.exists(mondo_path):
    cur = None
    for line in open(mondo_path, encoding="utf-8"):
        line = line.strip()
        if line.startswith("id: MONDO:"): cur = line[4:]
        elif line.startswith("xref: OMIM:") and cur and "MONDO:equivalentTo" in line:
            mondo_of[line.split()[1]] = cur


# ---------- Emit graph ----------
nodes, edges = {}, []
def edge(src, tgt, rel, evidence_type, source_db, refs, confidence, **extra):
    e = {"id": f"E{len(edges)+1:05d}", "source": src, "target": tgt, "relation": rel,
         "evidence_type": evidence_type, "source_db": source_db, "references": refs,
         "retrieved_at": TODAY, "confidence": confidence, "contradicts": [], **extra}
    edges.append(e); return e

role = {**{d: "core" for d in CORE}, **{d: "counterexample" for d in COUNTEREXAMPLES},
        **{d: "contrast" for d in CONTRAST}}

for d, gene in ALL.items():
    if d not in direct:
        print(f"WARNING: {d} has no HPO annotations; skipped"); continue
    nodes[d] = {"id": d, "type": "disease", "name": disease_name[d], "role": role[d],
                "mondo": mondo_of.get(d), "n_phenotypes": len(direct[d])}
    gid = f"HGNC_SYMBOL:{gene}"
    nodes.setdefault(gid, {"id": gid, "type": "gene", "name": gene,
                           "ncbi_gene": gene_ids.get(gene)})
    edge(gid, d, "causes", "curated", "HPO genes_to_disease (OMIM via mim2gene_medgen)",
         [d], 0.95)
    for a in direct[d]:
        nodes.setdefault(a["hp"], {"id": a["hp"], "type": "phenotype",
                                   "name": terms[a["hp"]].get("name"),
                                   "ic": round(IC.get(a["hp"], 0), 3)})
        conf = {"PCS": 0.9, "TAS": 0.8, "IEA": 0.6}.get(a["evidence"], 0.6)
        edge(d, a["hp"], "has_phenotype", "curated", "HPO phenotype.hpoa",
             [a["ref"]], conf, hpo_evidence=a["evidence"], frequency=a["freq"])

# Disease-disease similarity (computed, explainable via shared informative phenotypes)
dis = [d for d in ALL if d in nodes]
G = nx.Graph()
sim_rows = []
for a, b in itertools.combinations(dis, 2):
    s, shared = similarity(a, b)
    sim_rows.append((a, b, s, shared))
    G.add_edge(a, b, weight=s)

THRESH = sorted(r[2] for r in sim_rows)[int(len(sim_rows) * 0.5)]  # keep top half as graph edges
for a, b, s, shared in sim_rows:
    if s >= THRESH:
        edge(a, b, "phenotypically_similar_to", "computed", "IC-weighted Jaccard on HPO (propagated)",
             [], round(s, 3), shared_phenotypes=[{"id": t, "name": terms[t]["name"],
                                                  "ic": round(IC[t], 2)} for t in shared],
             method_note="Similarity is a hypothesis-generating signal, not evidence of shared mechanism.")

# kNN graph (k=3, symmetrised) + Louvain; stability = co-assignment frequency over 30 seeds (WP2.1, phenotype-only part)
K, SEEDS, STABLE_MIN = 3, range(30), 0.8
sim = {frozenset((a, b)): s for a, b, s, _ in sim_rows}
knn = nx.Graph(); knn.add_nodes_from(dis)
for d in dis:
    for o in sorted((x for x in dis if x != d), key=lambda x: -sim[frozenset((d, x))])[:K]:
        knn.add_edge(d, o, weight=sim[frozenset((d, o))])
runs = [nx.community.louvain_communities(knn, weight="weight", seed=s) for s in SEEDS]
co = collections.Counter()
for comms_s in runs:
    for c in comms_s:
        for x, y in itertools.combinations(sorted(c), 2): co[(x, y)] += 1
co_freq = lambda x, y: co[tuple(sorted((x, y)))] / len(runs)
comms = runs[0]  # reference partition (seed 0)
stab = {}
for c in comms:
    for d in c:
        others = [o for o in c if o != d]
        stab[d] = round(sum(co_freq(d, o) for o in others) / len(others), 3) if others else 1.0
clusters = [{"cluster": i, "members": [{"id": d, "name": nodes[d]["name"], "role": nodes[d]["role"], "gene": ALL[d],
                                         "stability": stab[d], "uncertain": stab[d] < STABLE_MIN} for d in sorted(c)]}
            for i, c in enumerate(comms)]
counter_pairs = [{"counterexample": c, "core": d, "gene": ALL[c], "same_cluster_freq": round(co_freq(c, d), 3)}
                 for c in COUNTEREXAMPLES for d in CORE if ALL[c] == ALL[d] and c in nodes and d in nodes]
# Counterexample check: a benign form must not share a cluster with its own gene's DEE. If it does, flag both (never hide).
member = {m["id"]: m for c in clusters for m in c["members"]}
cl_of = {m["id"]: c["cluster"] for c in clusters for m in c["members"]}
for pr in counter_pairs:
    pr["same_cluster_reference"] = cl_of[pr["counterexample"]] == cl_of[pr["core"]]
    if pr["same_cluster_reference"]:
        for k in (pr["counterexample"], pr["core"]):
            member[k]["uncertain"] = True
            member[k]["uncertain_reason"] = ("Same-gene benign counterexample falls in this cluster on phenotype similarity alone; "
                                             "treat the grouping as unresolved until mechanism evidence is added.")
cluster_report = {"k": K, "seeds": len(runs), "stable_min": STABLE_MIN, "method": "kNN(k=3) on phenotype similarity + Louvain",
                  "mean_stability": round(sum(stab.values()) / len(stab), 3),
                  "n_uncertain": sum(m["uncertain"] for m in member.values()), "counterexample_pairs": counter_pairs}
json.dump(cluster_report, open(f"{OUT}/cluster_report.json", "w"), indent=2)

with open(f"{OUT}/nodes.jsonl", "w") as f:
    for n in nodes.values(): f.write(json.dumps(n) + "\n")
with open(f"{OUT}/edges.jsonl", "w") as f:
    for e in edges: f.write(json.dumps(e) + "\n")
with open(f"{OUT}/similarity.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["a", "a_name", "b", "b_name", "similarity", "top_shared_phenotypes"])
    for a, b, s, shared in sorted(sim_rows, key=lambda r: -r[2]):
        w.writerow([a, nodes[a]["name"], b, nodes[b]["name"], round(s, 3),
                    "; ".join(terms[t]["name"] for t in shared[:5])])
json.dump(clusters, open(f"{OUT}/clusters.json", "w"), indent=2)

print(f"Diseases annotated in HPO: {N}")
print(f"Nodes: {len(nodes)}  Edges: {len(edges)}  MONDO xrefs found: {len(mondo_of)}")
for c in clusters:
    print(f"\nCluster {c['cluster']}:")
    for m in c["members"]:
        print(f"  [{m['role']:>14}] {m['gene']:<8} stab={m['stability']}{' UNCERTAIN' if m['uncertain'] else ''} {m['name']}")
print("\ncluster report:", json.dumps(cluster_report))
