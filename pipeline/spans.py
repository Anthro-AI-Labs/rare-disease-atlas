"""Quoted-span verification (CLAUDE.md rule 2) and explanation edge-id validation (rule 4)."""
import re


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def verify_span(span, abstract):
    """True iff span is a non-trivial exact substring of abstract after whitespace normalisation."""
    s = norm(span)
    return len(s) >= 15 and s in norm(abstract)


ID_RE = re.compile(r"\b(PMID:?\s*\d+|NCT\d{8}|OMIM:\d+|HP:\d{7}|MONDO:\d+)\b")


REDUCED_RE = re.compile(r"loss[- ]of[- ](?:\w+[- ]){0,2}function|\bLoF\b|haploinsufficien|dominant[- ]negative|(?:reduc\w*|decreas\w*|impair\w*)\s(?:\S+\s){0,4}function", re.I)
INCREASED_RE = re.compile(r"gain[- ]of[- ](?:\w+[- ]){0,2}function|\bGoF\b|(?:increas\w*|enhanc\w*)\s(?:\S+\s){0,4}function", re.I)
REDUCED, INCREASED = {"loss_of_function", "dominant_negative", "mixed"}, {"gain_of_function", "mixed"}


NEG_RE = re.compile(r"(?:rather than|instead of|\bnot\b|\bno\b|\bnor\b|without|unlike|\bthan\b|excluding)[^.;]{0,25}$", re.I)


def _asserted(rx, text):
    """True if rx matches somewhere that is not negated/contrasted just before ('rather than loss of function' asserts nothing)."""
    return any(not NEG_RE.search(text[max(0, m.start() - 30):m.start()]) for m in rx.finditer(text))


def effect_assertions(text):
    """Which variant-effect classes a sentence asserts: subset of {'reduced','increased'}."""
    return ({"reduced"} if _asserted(REDUCED_RE, text) else set()) | ({"increased"} if _asserted(INCREASED_RE, text) else set())


def validate_explanation(expl, path_edge_ids, allowed_refs=None, require_full=False, claim_info=None):
    """Return (ok, errors). Every step (and next_step) must cite >=1 edge id, all in the input path. If allowed_refs is given, any
    PMID/NCT/OMIM/HP/MONDO identifier written in the text must be in that set (no invented identifiers). require_full also demands
    a summary, >=1 step and >=1 uncertainty."""
    allowed, errs = set(path_edge_ids), []
    steps = list(expl.get("steps", []))
    ns = expl.get("next_step")
    if ns:
        steps.append({**ns, "_label": "next_step"})
    for i, st in enumerate(steps):
        lab = st.get("_label", f"step {i}")
        ids = st.get("edge_ids", [])
        if not ids:
            errs.append(f"{lab}: no edge_ids")
        errs += [f"{lab}: unknown edge id {e}" for e in ids if e not in allowed]
    if claim_info is not None:
        # a step asserting a variant effect must cite >= 1 claim whose span entails (entailment == yes) that effect class
        for i, st in enumerate(steps):
            lab = st.get("_label", f"step {i}")
            cited = [claim_info[e] for e in st.get("edge_ids", []) if e in claim_info and claim_info[e]["entailment"] == "yes"]
            for cls, ok_effects in (("reduced", REDUCED), ("increased", INCREASED)):
                if cls in effect_assertions(st.get("text", "")) and not any(c["variant_effect"] in ok_effects for c in cited):
                    errs.append(f"{lab}: asserts a {cls}-function effect but cites no claim with entailment=yes for it")
    if allowed_refs is not None:
        texts = [expl.get("summary_plain", ""), *expl.get("uncertainties", []), *(st.get("text", "") for st in steps)]
        for t in texts:
            for m in ID_RE.findall(t):
                if re.sub(r"[\s]", "", m).replace("PMID", "PMID:").replace("PMID::", "PMID:") not in allowed_refs:
                    errs.append(f"identifier not in input: {m}")
    if require_full:
        if not expl.get("summary_plain"): errs.append("missing summary_plain")
        if not expl.get("steps"): errs.append("no steps")
        if not expl.get("uncertainties"): errs.append("no uncertainties")
        if not ns: errs.append("missing next_step")
    return not errs, errs
