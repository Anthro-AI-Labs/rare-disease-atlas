"""docs/review_packet.md: reading aid for the 24 rows of evidence_review_v2.csv. Deterministic code only (no LLM).
Per row: number, gene, the claim in plain words, PubMed link, the full cached abstract with the quoted span in **bold**, keyword tags
([LoF] [GoF] [DN] for direction, [HUMAN] [MODEL] for population) and other project genes mentioned. It deliberately shows no verdicts,
confidence values or entailment results. Keyword tags are string matches, not judgements."""
import csv, json, re
from common import CURATED, GRAPH, ROOT, cache_get
from config import ALL
from spans import norm

DIR = [("DN", r"dominant[- ]negative"),
       ("LoF", r"loss[- ]of[- ](?:\w+[- ]){0,2}function|\bLoF\b|haploinsufficien\w*|\bnull\b|(?:reduc|decreas|impair|abolish|diminish)\w*\s(?:\w+\s){0,3}(?:function|activity|currents?|expression|levels?)"),
       ("GoF", r"gain[- ]of[- ](?:\w+[- ]){0,2}function|\bGoF\b|(?:increas|enhanc|elevat)\w*\s(?:\w+\s){0,3}(?:function|activity|currents?)|hyperactiv\w*|persistent (?:sodium )?currents?")]
POP = [("HUMAN", r"\b(?:patients?|individuals?|children|infants?|probands?|famil(?:y|ies)|cohorts?|humans?|subjects?|participants?|adults?|de novo)\b"),
       ("MODEL", r"\b(?:mice|mouse|murine|rats?|zebrafish|drosophila|flies|fly|knock-?in|knock-?out|transgenic|models?|iPSCs?|organoids?|HEK\d*|oocytes?|cell lines?|in vitro|in vivo|cultured)\b")]
RX = re.compile("|".join(f"(?P<{t}_{i}>{p})" for i, (t, p) in enumerate(DIR + POP)), re.I)
TAG = {t: t for t, _ in DIR + POP}
EFFECT = {"loss_of_function": "loss of function (the protein works less or not at all)", "gain_of_function": "gain of function (the protein is overactive)",
          "dominant_negative": "dominant negative (the faulty protein interferes with the healthy copy)", "mixed": "mixed: both reduced and increased function",
          "unclear": "an effect on the protein whose direction is not stated"}


def tag(text):
    def sub(m):
        name = next(k for k, v in m.groupdict().items() if v)
        return f"{m.group(0)}[{TAG[name.rsplit('_', 1)[0]]}]"
    return RX.sub(sub, text)


def marked(abstract, span):
    i = abstract.find(span) if span else -1
    if i < 0:                       # span is verified against the normalised abstract, which is what we store
        i = abstract.lower().find(norm(span).lower())
    if i < 0:
        return tag(abstract) + "\n\n*(quoted span not found verbatim in the cached abstract)*"
    return tag(abstract[:i]) + "**" + tag(abstract[i:i + len(span)]) + "**" + tag(abstract[i + len(span):])


def main():
    g = json.loads((GRAPH / "graph.json").read_text())
    edges = {e["id"]: e for e in g["edges"]}
    rows = list(csv.DictReader(open(CURATED / "evidence_review_v2.csv", newline="", encoding="utf-8-sig")))
    genes = sorted(set(ALL.values()))
    out = ["# Review packet: evidence_review_v2.csv", "",
           "Reading aid for the 24 rows, in file order. Deterministic text only: nothing here was written by a model, and no earlier verdicts or scores are shown.",
           "", "**How to read it.** The sentence the claim rests on is in **bold** inside the full abstract. Tags after a word are plain keyword matches, not judgements, "
           "and can be wrong or missing: `[LoF]` loss of function, `[GoF]` gain of function, `[DN]` dominant negative, `[HUMAN]` patient or human wording, "
           "`[MODEL]` animal, cell or model wording.",
           "", "**What to fill in `evidence_review_v2.csv`:** `about_this_gene`, `same_mechanism`, `human_patients` (yes/no), `verdict` (correct | partial | incorrect), `notes`, "
           "then `verified`, `verified_by`, `verified_at`. A second reviewer fills `second_verdict` and `second_by` without looking at the first verdict.", ""]
    for n, r in enumerate(rows, 1):
        e = edges.get(r["edge_id"])
        gene, pmid = r["gene"], r["pmid"]
        rec = (cache_get("pubmed_abs", pmid)[1] or {}).get("value", {})
        abstract = rec.get("abstract", "")
        if e:
            eff = EFFECT.get(e.get("extracted_variant_effect") or "unclear")
            dc = e.get("disease_context")
            ctx = "an unspecified disease" if dc in (None, "unspecified") else f"the disease “{dc}”"
            claim = f"Variants in **{gene}** have the effect: {eff}, in {ctx}."
        else:
            claim = r["claim"].split(";")[0].split("(")[0].strip() or "(claim text unavailable)"
        others = {x: len(re.findall(rf"\b{x}\b", abstract)) for x in genes if x != gene}
        others = {k: v for k, v in others.items() if v}
        out += [f"## Row {n} · {gene}", "", f"- **Claim:** {claim}", f"- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                f"- **Title:** {rec.get('title') or '(not cached)'}",
                f"- **Other project genes mentioned in this abstract:** " + (", ".join(f"{k} ({v}×)" for k, v in sorted(others.items())) if others else "none"),
                "", "**Abstract**", "", marked(abstract, r["quoted_span"]) if abstract else "*(abstract not cached)*", "", "---", ""]
    (ROOT / "docs" / "review_packet.md").write_text("\n".join(out), encoding="utf-8")
    print(f"wrote docs/review_packet.md ({len(rows)} rows)")


if __name__ == "__main__":
    main()
