"""ClinicalTrials.gov v2 per gene -> data/graph/trials.json (study nodes + studied_in edges, unnumbered).
Cached per gene in data/cache/ctgov. Run from repo root."""
import datetime, json, requests
from common import cached, GRAPH, throttle
from config import ALL, COUNTEREXAMPLES

API = "https://clinicaltrials.gov/api/v2/studies"
FIELDS = "NCTId,BriefTitle,OverallStatus,Phase,Condition,Keyword"


def fetch_gene(gene):
    def go():
        out, token = [], None
        while True:
            params = {"query.term": gene, "pageSize": 100, "fields": FIELDS}
            if token:
                params["pageToken"] = token
            throttle("ctgov", 2)
            r = requests.get(API, params=params, timeout=60)
            r.raise_for_status()
            d = r.json()
            out += d.get("studies", [])
            token = d.get("nextPageToken")
            if not token:
                return out
    return cached("ctgov", gene, go)


def parse(s):
    p = s["protocolSection"]
    idm, st = p["identificationModule"], p.get("statusModule", {})
    cm = p.get("conditionsModule", {})
    return {"nct": idm["nctId"], "title": idm.get("briefTitle", ""), "status": st.get("overallStatus"),
            "phases": p.get("designModule", {}).get("phases", []),
            "conditions": cm.get("conditions", []), "keywords": cm.get("keywords", [])}


def main():
    genes = sorted(set(ALL.values()))
    studies, links = {}, []
    for g in genes:
        for raw in fetch_gene(g):
            s = parse(raw)
            studies[s["nct"]] = s
            text = " ".join([s["title"], *s["conditions"], *s["keywords"]]).upper()
            links.append({"nct": s["nct"], "gene": g, "gene_in_record": g.upper() in text})
    out = {"retrieved_at": datetime.date.today().isoformat(), "studies": list(studies.values()), "links": links}
    (GRAPH / "trials.json").write_text(json.dumps(out, indent=1))
    n_in = sum(l["gene_in_record"] for l in links)
    print(f"genes={len(genes)} studies={len(studies)} gene-study links={len(links)} (gene symbol in title/conditions/keywords: {n_in})")
    for g in genes:
        print(f"  {g}: {sum(1 for l in links if l['gene']==g)} studies")


if __name__ == "__main__":
    main()
