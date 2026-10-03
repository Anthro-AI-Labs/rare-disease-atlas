"""WP3.2 network overlap: lead authors (first 2 + last 2) of the PubMed papers behind mechanism claims, shared across >= 2 genes
(hence >= 2 diseases). Same name != same person: ORCID or an affiliation match is required for a confirmed link, otherwise the
investigator is labelled "possible match". Authors are fetched once per PMID (cache ns pubmed_authors). Output: data/graph/network.json."""
import json, re, unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict
from common import GRAPH, cached, cache_get, ncbi_get
import mech

TOP_N = 120
LEAD_FIRST, LEAD_LAST = 2, 2
GENERIC = {"department", "dept", "of", "and", "the", "university", "hospital", "school", "medicine", "institute", "center", "centre",
           "division", "faculty", "college", "medical", "sciences", "science", "health", "research", "clinical"}


def fold(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower().strip()


def fetch_authors(pmids):
    todo = [p for p in pmids if cache_get("pubmed_authors", p)[1] is None]
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        root = ET.fromstring(ncbi_get("efetch.fcgi", {"db": "pubmed", "id": ",".join(batch), "retmode": "xml"}).content)
        got = {}
        for art in root.iter("PubmedArticle"):
            pmid = art.findtext(".//MedlineCitation/PMID")
            au = []
            for a in art.findall(".//AuthorList/Author"):
                last = a.findtext("LastName") or a.findtext("CollectiveName") or ""
                orcid = next((re.sub(r"\D*(\d{4}-\d{4}-\d{4}-\d{3}[\dX]).*", r"\1", (x.text or "")) for x in a.findall("Identifier") if x.get("Source") == "ORCID"), "")
                au.append({"last": last, "fore": a.findtext("ForeName") or "", "initials": a.findtext("Initials") or "", "orcid": orcid,
                           "affils": [x.text or "" for x in a.findall("AffiliationInfo/Affiliation")], "collective": a.find("CollectiveName") is not None})
            got[pmid] = au
        for p in batch:
            cached("pubmed_authors", p, lambda p=p: got.get(p, []))
    return {p: cache_get("pubmed_authors", p)[1]["value"] for p in pmids}


def aff_tokens(a):
    a = re.sub(r"\S+@\S+", " ", fold(a))
    return {t for t in re.findall(r"[a-z]{3,}", a) if t not in GENERIC}


def aff_match(a1, a2):
    t1, t2 = aff_tokens(a1), aff_tokens(a2)
    return bool(t1 and t2) and len(t1 & t2) / len(t1 | t2) >= 0.5


def main():
    g = json.loads((GRAPH / "graph.json").read_text())
    claims = mech.load_claims()
    pmid_genes = defaultdict(set)
    for c in claims:
        pmid_genes[c["pmid"]].add(c["gene"].upper())
    authors = fetch_authors(sorted(pmid_genes))
    persons = defaultdict(lambda: {"papers": defaultdict(list), "genes": set(), "orcids": set(), "forenames": set()})
    for pmid, au in authors.items():
        lead = [a for i, a in enumerate(au) if (i < LEAD_FIRST or i >= len(au) - LEAD_LAST) and not a["collective"] and a["last"]]
        for a in lead:
            key = fold(a["last"]) + "|" + fold(a["initials"] or a["fore"])[:1]
            pr = persons[key]
            pr["papers"][pmid] += a["affils"]
            pr["genes"] |= pmid_genes[pmid]
            if a["orcid"]: pr["orcids"].add(a["orcid"])
            pr["forenames"].add(a["fore"] or a["initials"])
            pr["name"] = (a["last"], a["fore"] or a["initials"])
    out = []
    for key, pr in persons.items():
        ps = list(pr["papers"])
        # shared only if two DIFFERENT papers support two DIFFERENT genes (one multi-gene review is not an overlap)
        if not any(g1 != g2 for i, p1 in enumerate(ps) for p2 in ps[i + 1:] for g1 in pmid_genes[p1] for g2 in pmid_genes[p2]):
            continue
        # affiliation match: two papers about DIFFERENT genes with matching affiliations
        by_gene = defaultdict(list)
        for pmid, aff in pr["papers"].items():
            for gene in pmid_genes[pmid]:
                by_gene[gene] += aff
        genes = sorted(by_gene)
        aff_ok = any(aff_match(x, y) for i, g1 in enumerate(genes) for g2 in genes[i + 1:] for x in by_gene[g1] for y in by_gene[g2])
        if len(pr["orcids"]) > 1:
            level = "possible"   # conflicting ORCIDs under one name key: certainly more than one person
        elif pr["orcids"] and sum(1 for p in pr["papers"] if any(a["orcid"] in pr["orcids"] for a in authors[p] if fold(a["last"]) == key.split("|")[0])) >= 2:
            level = "orcid"
        elif aff_ok:
            level = "affiliation"
        else:
            level = "possible"
        out.append({"id": "INV:" + re.sub(r"[^a-z0-9]+", "-", key).strip("-"), "name": f"{pr['name'][0]} {pr['name'][1]}".strip(),
                    "match_level": level, "orcid": sorted(pr["orcids"])[0] if len(pr["orcids"]) == 1 else "",
                    "genes": genes, "pmids": sorted(pr["papers"]), "affiliation_example": next((a for aff in pr["papers"].values() for a in aff), "")})
    out.sort(key=lambda x: (-len(x["genes"]), -len(x["pmids"]), x["id"]))
    total_shared = len(out)
    out = out[:TOP_N]
    stats = {"papers_with_authors": len(authors), "persons_total": len(persons), "shared_ge2_genes_total": total_shared, "kept": len(out),
             "by_level": {l: sum(1 for x in out if x["match_level"] == l) for l in ("orcid", "affiliation", "possible")}}
    (GRAPH / "network.json").write_text(json.dumps({"investigators": out, "stats": stats, "lead_authors": f"first {LEAD_FIRST} + last {LEAD_LAST}"}, indent=1))
    print(stats)


if __name__ == "__main__":
    main()
