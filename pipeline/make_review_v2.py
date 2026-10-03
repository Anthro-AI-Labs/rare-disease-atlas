"""data/curated/evidence_review_v2.csv: 24 mechanism claims, random (seed 7) and stratified 8 per confidence tier
(0.8 / 0.7 / <=0.5), covering all genes, excluding claims already in evidence_review.csv. Reviewer columns left empty.
Verdict values: correct | partial | incorrect. Refuses to overwrite an existing file."""
import csv, json, random, sys
from common import GRAPH, CURATED
from curated import FILES, load
from spans import norm

out = CURATED / "evidence_review_v2.csv"
if out.exists():
    sys.exit("evidence_review_v2.csv exists; not overwriting")
g = json.loads((GRAPH / "graph.json").read_text())
done = {(r["pmid"], norm(r["quoted_span"])) for r in load("evidence_review")}
tier = lambda c: "0.8" if c >= 0.8 else "0.7" if c >= 0.7 else "<=0.5"
rng = random.Random(7)
pool = {t: [] for t in ("0.8", "0.7", "<=0.5")}
for e in sorted((e for e in g["edges"] if e["relation"] == "has_variant_effect"), key=lambda e: e["id"]):
    if (e["references"][0].removeprefix("PMID:"), norm(e["quoted_span"])) not in done:
        pool[tier(e["confidence"])].append(e)
for v in pool.values():
    rng.shuffle(v)
genes = sorted({e["source"] for v in pool.values() for e in v})
chosen = {t: [] for t in pool}
need = {t: 8 for t in pool}
# pass 1: guarantee every gene appears once, rotating tiers; pass 2: fill each tier randomly
order = list(pool)
for i, gene in enumerate(genes):
    for k in range(3):
        t = order[(i + k) % 3]
        hit = next((e for e in pool[t] if e["source"] == gene and need[t]), None)
        if hit:
            chosen[t].append(hit); pool[t].remove(hit); need[t] -= 1
            break
for t in pool:
    while need[t] and pool[t]:
        chosen[t].append(pool[t].pop()); need[t] -= 1
rows = [e for t in chosen for e in chosen[t]]
with out.open("w", newline="") as f:
    w = csv.DictWriter(f, FILES["evidence_review"]); w.writeheader()
    for e in sorted(rows, key=lambda e: (tier(e["confidence"]), e["source"], e["id"])):
        w.writerow({"edge_id": e["id"], "gene": e["source"].split(":")[1],
                    "claim": f"{e['target'].split(':', 1)[1].replace('|', ' / ').replace('_', ' ')} ({e['population']}; disease: {e['disease_context']}; confidence {e['confidence']})",
                    "quoted_span": e["quoted_span"], "pmid": e["references"][0].removeprefix("PMID:")})
print({t: len(v) for t, v in chosen.items()}, "genes covered:", len({e["source"] for e in rows}), "of", len(genes))
