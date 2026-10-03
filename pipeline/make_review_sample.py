"""Draft data/curated/evidence_review.csv: ~20 mechanism edges stratified by gene, prioritising span_mentions_gene=false and
non-human claims. Reviewer columns are left empty for a human. Refuses to overwrite a file that has reviewer input."""
import csv, json, random, sys
from common import GRAPH, CURATED
from curated import FILES

N, PER_GENE = 20, 2
out = CURATED / "evidence_review.csv"
if out.exists() and any(r.get("verdict") for r in csv.DictReader(out.open())):
    sys.exit("evidence_review.csv already has verdicts; not overwriting")
g = json.loads((GRAPH / "graph.json").read_text())
rng = random.Random(7)
by_gene = {}
for e in g["edges"]:
    if e["relation"] == "has_variant_effect":
        by_gene.setdefault(e["source"].split(":")[1], []).append(e)
prio = lambda e: (e["span_mentions_gene"], e["population"] == "human", rng.random())  # False sorts first
pick, rest = [], []
for gene, es in sorted(by_gene.items()):
    es = sorted(es, key=prio)
    pick += es[:PER_GENE]; rest += es[PER_GENE:]
pick += sorted(rest, key=prio)[: max(0, N - len(pick))]
pick = pick[:N]
with out.open("w", newline="") as f:
    w = csv.DictWriter(f, FILES["evidence_review"]); w.writeheader()
    for e in sorted(pick, key=lambda e: e["id"]):
        n = e["target"].split(":", 1)[1].replace("|", " / ").replace("_", " ")
        w.writerow({"edge_id": e["id"], "gene": e["source"].split(":")[1],
                    "claim": f"{n} ({e['population']}; disease: {e['disease_context']})",
                    "quoted_span": e["quoted_span"], "pmid": e["references"][0].replace("PMID:", "")})
print(f"wrote {len(pick)} rows; mentions_gene=false: {sum(not e['span_mentions_gene'] for e in pick)}; "
      f"non-human: {sum(e['population'] != 'human' for e in pick)}; genes: {len({e['source'] for e in pick})}")
