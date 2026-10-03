"""WP3.5: unified search index over the graph. Disease (+MONDO synonyms), gene, symptom (HPO terms + synonyms, resolved to the slice
diseases through propagated annotations), mechanism, patient group. Written to web/public/data/search.json."""
import json, re
from common import ROOT


def parse_obo(path, want=None):
    """id -> {name, synonyms[], parents[]} (synonyms: EXACT/RELATED/NARROW/BROAD text)."""
    out, cur = {}, None
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line == "[Term]":
            cur = {"synonyms": [], "parents": []}
        elif line.startswith("[") and line.endswith("]"):
            cur = None
        elif cur is not None and ":" in line:
            k, v = line.split(":", 1); v = v.strip()
            if k == "id":
                cur["id"] = v; out[v] = cur
            elif k == "name": cur["name"] = v
            elif k == "synonym":
                m = re.match(r'"(.*)"\s', v)
                if m: cur["synonyms"].append(m.group(1))
            elif k == "is_a": cur["parents"].append(v.split(" ! ")[0].strip())
            elif k == "is_obsolete" and v == "true": cur["obsolete"] = True
    return out


def slug(s):
    return s.replace(":", "_")


def build(nodes, edges, clusters_diseases):
    raw = ROOT / "data" / "raw"
    hp = parse_obo(raw / "hp.obo")
    mondo_ids = {n["mondo"] for n in nodes.values() if n["type"] == "disease" and n.get("mondo")}
    mondo = {k: v for k, v in parse_obo(raw / "mondo.obo").items() if k in mondo_ids} if (raw / "mondo.obo").exists() else {}
    gene_of = {e["target"]: nodes[e["source"]]["name"] for e in edges if e["relation"] == "causes"}
    items = []
    # diseases
    for n in nodes.values():
        if n["type"] != "disease":
            continue
        syn = list(mondo.get(n.get("mondo"), {}).get("synonyms", []))
        mname = mondo.get(n.get("mondo"), {}).get("name")
        aliases = [a for a in {*syn, *( [mname] if mname else [] ), gene_of[n["id"]], n["id"], n.get("mondo") or ""} if a and a != n["name"]]
        items.append({"type": "disease", "id": n["id"], "label": n["name"], "aliases": sorted(aliases), "href": f"/disease/{slug(n['id'])}",
                      "sub": f"{gene_of[n['id']]} · {n['id']}" + (" · benign counterexample" if n.get("role") == "counterexample" else "")})
    # genes
    for n in nodes.values():
        if n["type"] == "gene":
            ds = [d for d, g in gene_of.items() if g == n["name"]]
            items.append({"type": "gene", "id": n["id"], "label": n["name"], "aliases": [str(n.get("ncbi_gene") or "")] if n.get("ncbi_gene") else [],
                          "href": f"/gene/{n['name']}", "sub": f"{len(ds)} disease(s) in slice"})
    # phenotypes: every HPO term that is an ancestor-or-self of a slice annotation -> diseases (propagated)
    def anc(t, memo={}):
        if t in memo: return memo[t]
        seen, st = {t}, [t]
        while st:
            for p in hp.get(st.pop(), {}).get("parents", []):
                if p not in seen: seen.add(p); st.append(p)
        memo[t] = seen
        return seen
    term_dis = {}
    for e in edges:
        if e["relation"] == "has_phenotype":
            for t in anc(e["target"]):
                if t in hp and not hp[t].get("obsolete") and t not in ("HP:0000118", "HP:0000001", "HP:0000005"):
                    term_dis.setdefault(t, set()).add(e["source"])
    for t, ds in sorted(term_dis.items()):
        items.append({"type": "symptom", "id": t, "label": hp[t]["name"], "aliases": sorted(set(hp[t]["synonyms"]) - {hp[t]["name"]})[:12],
                      "href": f"/phenotype/{slug(t)}", "sub": f"{t} · {len(ds)} disease(s) in slice", "diseases": sorted(ds)})
    # mechanisms
    for n in nodes.values():
        if n["type"] == "mechanism":
            ve, mf = n["variant_effect"], n["molecular_function"]
            words = [ve.replace("_", " "), mf.replace("_", " "), {"loss_of_function": "LoF haploinsufficiency", "gain_of_function": "GoF"}.get(ve, "")]
            items.append({"type": "mechanism", "id": n["id"], "label": n["name"], "aliases": [w for w in words if w], "href": f"/mechanism/{ve}--{mf}",
                          "sub": "variant effect × molecular function"})
    # patient groups
    for n in nodes.values():
        if n["type"] == "patient_org":
            items.append({"type": "patient_group", "id": n["id"], "label": n["name"], "aliases": [], "href": f"/org/{n['id'].split(':', 1)[1]}",
                          "sub": str(n.get("country") or "")})
    return items
