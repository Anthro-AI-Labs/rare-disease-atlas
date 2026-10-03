"""Entailment check: a verbatim span is not necessarily a SUPPORTING span. For each directional claim, a second OpenAI call sees ONLY
the gene, the claimed variant_effect and the quoted_span (not the abstract) and answers: does the span by itself state or directly
imply this effect (yes/partial/no), and which population does the span describe (human/animal/in_vitro/not_stated)?
Output data/graph/entailment.json keyed by original claim id; mech.load_claims() applies it as an overlay. Cached per (span, gene, effect,
prompt, model); needs OPENAI_API_KEY / OPENAI_MODEL."""
import hashlib, json, os, sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from typing import Literal
from pydantic import BaseModel
from common import GRAPH, cached
import mech

SYSTEM = """You audit one claim extracted from a PubMed abstract. You see ONLY the gene, the claimed variant effect, and one quoted sentence.
Judge the sentence alone; do not use outside knowledge about the gene.
entailment:
- yes: the sentence by itself states or directly implies that variants/the gene disruption have the claimed effect on the gene product (loss_of_function = reduced or absent function/expression/haploinsufficiency; gain_of_function = increased or constitutive activity; dominant_negative = mutant interferes with the wild-type; mixed = both reduced and increased effects are stated).
- partial: the sentence points toward the claimed effect only indirectly, for one variant or assay only, ambiguously, or the direction is not clearly the claimed one.
- no: the sentence states no variant effect on the gene product (e.g. it describes phenotypes, patient numbers, treatment, expression patterns, or a different effect).
population describes who/what the sentence is about: human = patients or human subjects (clinical reports, patient variants described in patients); in_vitro = cell lines, heterologous expression, patient-derived neurons or iPSC, electrophysiology on cells; animal = mouse/rat/zebrafish/fly or other model organisms; not_stated = the sentence does not say.
rationale: at most 20 words."""
PROMPT_HASH = hashlib.sha256(SYSTEM.encode()).hexdigest()[:10]


class Verdict(BaseModel):
    entailment: Literal["yes", "partial", "no"]
    population: Literal["human", "animal", "in_vitro", "not_stated"]
    rationale: str


def check(client, model, gene, effect, span):
    def go():
        r = client.chat.completions.parse(model=model, response_format=Verdict, messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Gene: {gene}\nClaimed variant effect: {effect}\nQuoted sentence: {span}"}])
        return r.choices[0].message.parsed.model_dump()
    return cached("llm_entail", f"{gene}|{effect}|{span}|{PROMPT_HASH}|{model}", go)


def main():
    model = os.getenv("OPENAI_MODEL")
    if not os.getenv("OPENAI_API_KEY") or not model:
        print("SKIPPED: OPENAI_API_KEY / OPENAI_MODEL not set; claims keep extractor values (no entailment overlay)"); return
    from openai import OpenAI
    client = OpenAI()
    claims = mech.load_claims(overlay=False)
    todo = [c for c in claims if c["variant_effect"] != "unclear"]
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda c: check(client, model, c["gene"].upper(), c["variant_effect"], c["quoted_span"]), todo))
    out = {mech.claim_id(c): r for c, r in zip(todo, res)}
    stats = {"checked": len(out), "skipped_unclear": len(claims) - len(out), "by_verdict": dict(Counter(r["entailment"] for r in res)),
             "by_gene": {}, "population_changed": sum(c["population"] != r["population"] for c, r in zip(todo, res)),
             "population_checked": dict(Counter(r["population"] for r in res))}
    for c, r in zip(todo, res):
        stats["by_gene"].setdefault(c["gene"].upper(), Counter())[r["entailment"]] += 1
    stats["by_gene"] = {g: dict(v) for g, v in sorted(stats["by_gene"].items())}
    (GRAPH / "entailment.json").write_text(json.dumps({"model": model, "prompt_hash": PROMPT_HASH, "stats": stats, "verdicts": out}, indent=1))
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    main()
