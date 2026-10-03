"""WP1.2: PubMed -> OpenAI structured output -> exact quoted-span verification -> data/graph/mechanisms.json.
Everything cached in data/cache (PubMed per PMID; LLM per PMID+gene+prompt-hash+model). Needs OPENAI_API_KEY, OPENAI_MODEL."""
import datetime, hashlib, json, os, sys
import xml.etree.ElementTree as ET
from typing import Literal
from pydantic import BaseModel
from common import cached, cache_get, ncbi_get, GRAPH
from config import ALL
from spans import verify_span, norm

VariantEffect = Literal["loss_of_function", "gain_of_function", "dominant_negative", "mixed", "unclear"]
MolFunction = Literal["sodium_channel", "potassium_channel", "synaptic_vesicle_release", "synaptic_signaling",
                      "kinase_signaling", "g_protein_signaling", "other"]


class Claim(BaseModel):
    gene: str
    variant_effect: VariantEffect
    molecular_function: MolFunction
    linked_phenotype_or_disease: str
    population: Literal["human", "animal", "in_vitro"]
    quoted_span: str  # must be copied verbatim from the abstract


class Claims(BaseModel):
    claims: list[Claim]


SYSTEM = """You extract gene-level mechanism claims from ONE PubMed abstract.
Return only claims explicitly stated in the abstract about the target gene's variant effect
(variant_effect) and the molecular function of the gene product (molecular_function).
quoted_span MUST be a verbatim contiguous excerpt (15-300 chars) copied exactly from the abstract that supports the claim.
Use "unclear" when the direction is not stated; never infer beyond the text. population = human patients,
animal model, or in_vitro (cells/electrophysiology). If no mechanism claim is stated, return an empty list."""
PROMPT_HASH = hashlib.sha256(SYSTEM.encode()).hexdigest()[:10]
QUERY = ('{g}[tiab] AND (loss-of-function OR gain-of-function OR haploinsufficiency OR dominant-negative '
         'OR "functional analysis")')


def search(gene):
    def go():
        r = ncbi_get("esearch.fcgi", {"db": "pubmed", "term": QUERY.format(g=gene), "retmax": 40, "retmode": "json"})
        return r.json()["esearchresult"]["idlist"]
    return cached("pubmed_search", gene + QUERY, go)


def fetch_abstracts(pmids):
    out, todo = {}, []
    for p in pmids:
        _, hit = cache_get("pubmed_abs", p)
        (out.__setitem__(p, hit["value"]) if hit else todo.append(p))
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        root = ET.fromstring(ncbi_get("efetch.fcgi", {"db": "pubmed", "id": ",".join(batch), "retmode": "xml"}).content)
        for art in root.iter("PubmedArticle"):
            pmid = art.findtext(".//MedlineCitation/PMID")
            parts = ["".join(t.itertext()).strip() for t in art.findall(".//Abstract/AbstractText")]
            rec = {"pmid": pmid, "title": "".join(art.find(".//ArticleTitle").itertext()) if art.find(".//ArticleTitle") is not None else "",
                   "abstract": norm(" ".join(parts)), "year": art.findtext(".//JournalIssue/PubDate/Year") or ""}
            out[pmid] = cached("pubmed_abs", pmid, lambda rec=rec: rec)
        for p in batch:  # PMIDs with no record: cache an empty abstract so we never re-fetch
            if p not in out:
                out[p] = cached("pubmed_abs", p, lambda p=p: {"pmid": p, "title": "", "abstract": "", "year": ""})
    return out


def extract(client, model, gene, rec):
    def go():
        resp = client.chat.completions.parse(
            model=model, response_format=Claims,
            messages=[{"role": "system", "content": SYSTEM},
                      {"role": "user", "content": f"Target gene: {gene}\nTitle: {rec['title']}\nAbstract: {rec['abstract']}"}])
        return [c.model_dump() for c in resp.choices[0].message.parsed.claims]
    return cached("llm_claims", f"{rec['pmid']}|{gene}|{PROMPT_HASH}|{model}", go)


def main():
    model = os.getenv("OPENAI_MODEL")
    if not os.getenv("OPENAI_API_KEY") or not model:
        print("SKIPPED: OPENAI_API_KEY and OPENAI_MODEL must be set (see .env.example); no mechanism edges built"); return
    from openai import OpenAI
    client = OpenAI()
    kept, stats = [], {"abstracts": 0, "extracted": 0, "verified": 0, "dropped_span": 0, "dropped_gene": 0, "by_gene": {}}
    for gene in sorted(set(ALL.values())):
        recs = fetch_abstracts(search(gene))
        g = stats["by_gene"].setdefault(gene, {"abstracts": 0, "verified": 0})
        for pmid, rec in recs.items():
            if not rec["abstract"]:
                continue
            stats["abstracts"] += 1; g["abstracts"] += 1
            for c in extract(client, model, gene, rec):
                stats["extracted"] += 1
                if c["gene"].upper() != gene:
                    stats["dropped_gene"] += 1; continue
                if not verify_span(c["quoted_span"], rec["abstract"]):
                    stats["dropped_span"] += 1; continue
                stats["verified"] += 1; g["verified"] += 1
                kept.append({**c, "pmid": pmid, "year": rec["year"], "title": rec["title"]})
    stats["span_drop_rate"] = round(stats["dropped_span"] / stats["extracted"], 3) if stats["extracted"] else None
    out = {"retrieved_at": datetime.date.today().isoformat(), "model": model, "prompt_hash": PROMPT_HASH,
           "claims": kept, "stats": stats}
    (GRAPH / "mechanisms.json").write_text(json.dumps(out, indent=1))
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    main()
