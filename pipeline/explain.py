"""WP3.1: pre-generate a plain-language explanation for every disease route -> data/graph/explanations.json.
Input = the route's edges only. Output validated (edge ids + no invented identifiers). Reject -> retry once with the errors -> template.
Reads data/graph/graph.json (run export first); export merges the result. Cache: data/cache/llm_explain."""
import datetime, hashlib, json, os, re
from pydantic import BaseModel
from common import ROOT, GRAPH, cached
from spans import validate_explanation

PROMPT = json.loads((ROOT / "web" / "lib" / "explain-prompt.json").read_text())["system"]


class Step(BaseModel):
    text: str
    edge_ids: list[str]


class Explanation(BaseModel):
    summary_plain: str
    steps: list[Step]
    uncertainties: list[str]
    next_step: Step


def path_edge_ids(g, did):
    """Edges that make up the route for one disease (bounded, deterministic)."""
    nodes = {n["id"]: n for n in g["nodes"]}
    edges = {e["id"]: e for e in g["edges"]}
    d = nodes[did]
    gap = g["meta"]["gaps"][did]
    gene = next(e for e in g["edges"] if e["relation"] == "causes" and e["target"] == did)
    ids = [gene["id"]]
    claims = [e for e in g["edges"] if e["source"] == gene["source"] and e["relation"] == "has_variant_effect"
              and e["disease_context"] in (d["name"],) and nodes[e["target"]]["variant_effect"] != "unclear"]
    sole = sum(1 for e in g["edges"] if e["relation"] == "causes" and e["source"] == gene["source"]) == 1
    if sole:
        claims += [e for e in g["edges"] if e["source"] == gene["source"] and e["relation"] == "has_variant_effect"
                   and e["disease_context"] == "unspecified" and nodes[e["target"]]["variant_effect"] != "unclear"]
    claims.sort(key=lambda e: (e.get("entailment") != "yes", -e["confidence"]))
    ids += [e["id"] for e in claims[:3]]
    for e in claims:  # both sides of a conflict, if this disease has one
        if e["status"] == "contradicted":
            ids += [e["id"]] + e["contradicts"][:2]
    for r in gap["routes"]:
        ids += r["edge_ids"][:4]
        ids += (r["leads"]["patient_groups"] + r["leads"]["trials"][:2] + r["leads"]["assets"][:2])
    own = [e for e in g["edges"] if e["target"] == did and e["relation"] in ("studied_in", "serves")]
    own.sort(key=lambda e: nodes[e["source"]].get("status") != "RECRUITING")
    ids += [e["id"] for e in own[:4]]
    ids += [e["id"] for e in g["edges"] if e["source"] == gene["source"] and e["relation"] == "has_asset"][:3]
    seen, out = set(), []
    for i in ids:
        if i in edges and i not in seen:
            seen.add(i); out.append(i)
    return out


def summarize(g, ids):
    nodes = {n["id"]: n for n in g["nodes"]}
    edges = {e["id"]: e for e in g["edges"]}
    out = []
    for i in ids:
        e = edges[i]
        out.append({k: v for k, v in {
            "id": i, "relation": e["relation"], "source": nodes[e["source"]].get("name"), "target": nodes[e["target"]].get("name"),
            "evidence_type": e["evidence_type"], "status": e["status"], "confidence": e["confidence"], "references": e["references"],
            "quoted_span": e.get("quoted_span"), "population": e.get("population"), "disease_context": e.get("disease_context"),
            "span_entails_effect": e.get("entailment"), "claimed_variant_effect": nodes[e["target"]].get("variant_effect"),
            "note": e.get("method_note") or e.get("note") or None,
            "shared_phenotypes": [p["name"] for p in e.get("shared_phenotypes", [])[:4]] or None}.items() if v})
    return out


def claim_info(g):
    nodes = {n["id"]: n for n in g["nodes"]}
    return {e["id"]: {"variant_effect": nodes[e["target"]]["variant_effect"], "entailment": e.get("entailment")}
            for e in g["edges"] if e["relation"] == "has_variant_effect"}


def allowed_refs(g, ids):
    edges = {e["id"]: e for e in g["edges"]}
    refs = set()
    for i in ids:
        e = edges[i]
        refs |= {re.sub(r"\s", "", r) for r in e["references"]} | {e["source"], e["target"]}
    return refs


def template(g, did, ids):
    """Deterministic fallback; every sentence cites edge ids that exist in the path."""
    nodes = {n["id"]: n for n in g["nodes"]}
    edges = {e["id"]: e for e in g["edges"]}
    gap = g["meta"]["gaps"][did]
    steps = []
    for i in ids[:6]:
        e = edges[i]
        steps.append({"text": f"{nodes[e['source']].get('name')} — {e['relation'].replace('_', ' ')} — {nodes[e['target']].get('name')} "
                              f"({e['evidence_type']}, status {e['status']}, confidence {e['confidence']}).", "edge_ids": [i]})
    return {"summary_plain": f"Route status for {nodes[did]['name']}: {gap['route_status']}. This summary lists the recorded edges only; it is not an interpretation.",
            "steps": steps, "uncertainties": (gap["missing"][:4] or ["No gaps recorded."]) + ["Computed similarity is a hypothesis, not evidence of shared mechanism."],
            "next_step": {"text": gap["suggested_question"], "edge_ids": ids[:1]}}


def generate(client, model, g, did):
    ids = path_edge_ids(g, did)
    inp = json.dumps(summarize(g, ids), indent=1)
    refs = allowed_refs(g, ids)
    errs, res = [], None
    for attempt in (1, 2):
        user = f"Disease: {next(n for n in g['nodes'] if n['id'] == did)['name']}\nINPUT_EDGES:\n{inp}"
        if errs:
            user += "\n\nYour previous answer was rejected for: " + "; ".join(errs[:8]) + ". Fix these problems."
        key = hashlib.sha256((PROMPT + user + model).encode()).hexdigest()
        def go():
            r = client.chat.completions.parse(model=model, response_format=Explanation,
                                              messages=[{"role": "system", "content": PROMPT}, {"role": "user", "content": user}])
            return r.choices[0].message.parsed.model_dump()
        res = cached("llm_explain", key, go)
        ok, errs = validate_explanation(res, ids, refs, require_full=True, claim_info=claim_info(g))
        if ok:
            return {**res, "source": "llm", "attempts": attempt, "first_try_pass": attempt == 1, "input_edge_ids": ids, "validation_errors": []}
    return {**template(g, did, ids), "source": "template", "attempts": 2, "first_try_pass": False, "input_edge_ids": ids,
            "validation_errors": errs}


def main():
    g = json.loads((GRAPH / "graph.json").read_text())
    model = os.getenv("OPENAI_MODEL")
    ds = [n["id"] for n in g["nodes"] if n["type"] == "disease"]
    out = {}
    client = None
    if os.getenv("OPENAI_API_KEY") and model:
        from openai import OpenAI
        client = OpenAI()
    for did in ds:
        if client:
            ex = generate(client, model, g, did)
        else:
            ids = path_edge_ids(g, did)
            ex = {**template(g, did, ids), "source": "template", "attempts": 0, "first_try_pass": False, "input_edge_ids": ids, "validation_errors": ["OpenAI not configured"]}
        ex["model"] = model if ex["source"] == "llm" else None
        ex["generated_at"] = datetime.date.today().isoformat()
        out[did] = ex
    stats = {"diseases": len(out), "llm": sum(e["source"] == "llm" for e in out.values()),
             "first_try_pass": sum(e["first_try_pass"] for e in out.values()), "template_fallback": sum(e["source"] == "template" for e in out.values())}
    (GRAPH / "explanations.json").write_text(json.dumps({"explanations": out, "stats": stats}, indent=1))
    print(stats)


if __name__ == "__main__":
    main()
