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
        if n["id"] == "OMIM:300672" or gene_of.get(n["id"]) == "CDKL5":
            aliases.extend(["CDKL5 deficiency disorder", "CDKL5 deficiency", "CDD"])
        items.append({"type": "disease", "id": n["id"], "label": n["name"], "aliases": sorted(set(aliases)), "href": f"/disease/{slug(n['id'])}",
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

    # studies and assets (STARR, EMBOLD, FENDEEP, Simons Searchlight, NCT IDs, etc.)
    assets_by_ident = {}
    for n in nodes.values():
        if n["type"] == "asset":
            ident = n.get("identifier", "").strip()
            if ident:
                assets_by_ident.setdefault(ident, []).append(n)

    seen_studies = set()
    studies_with_edges = set()

    def extract_acronyms(*texts):
        found = set()
        for text in texts:
            if not text:
                continue
            for m in re.findall(r"\(([A-Za-z0-9-]{3,})\)", text):
                found.add(m)
            if "Simons Searchlight" in text:
                found.add("Simons Searchlight")
                found.add("Simons")
            if "STARR" in text:
                found.add("STARR")
            if "EMBOLD" in text:
                found.add("EMBOLD")
            if "FENDEEP" in text:
                found.add("FENDEEP")
        return found

    for e in edges:
        if e["relation"] == "studied_in":
            sid = e["source"]
            did = e["target"]
            studies_with_edges.add(sid)
            snode = nodes.get(sid)
            if not snode:
                continue
            key = (sid, did)
            if key in seen_studies:
                continue
            seen_studies.add(key)
            matched_assets = assets_by_ident.get(sid, [])
            asset_names = [a["name"] for a in matched_assets]
            all_acronyms = extract_acronyms(snode["name"], *asset_names)
            aliases = list({sid, *all_acronyms})
            best_name = next((an for an in asset_names if any(f"({ac})" in an for ac in all_acronyms)), snode["name"])
            items.append({
                "type": "study",
                "id": f"study_{sid}_{slug(did)}",
                "label": best_name,
                "aliases": sorted(aliases),
                "href": f"/disease/{slug(did)}",
                "sub": f"{gene_of.get(did, '')} · {sid}"
            })

    for e in edges:
        if e["relation"] == "has_asset":
            gid = e["source"]
            aid = e["target"]
            anode = nodes.get(aid)
            if not anode:
                continue
            ident = anode.get("identifier", "").strip()
            if ident and ident in studies_with_edges:
                continue  # already indexed via condition-matched studied_in edges
            gene = gid.split(":")[1]
            name = anode["name"]
            all_acronyms = extract_acronyms(name)
            dids = [d for d, g in gene_of.items() if g == gene]
            for did in dids:
                ref_id = ident or aid
                key = (ref_id, did)
                if key in seen_studies:
                    continue
                seen_studies.add(key)
                aliases = list({a for a in [ident, *all_acronyms] if a})
                items.append({
                    "type": "study",
                    "id": f"asset_{slug(anode['id'])}_{slug(did)}",
                    "label": name,
                    "aliases": sorted(aliases),
                    "href": f"/disease/{slug(did)}",
                    "sub": f"{gene} · {ident or anode.get('asset_type', 'asset')}"
                })

    return items
