"""Focused slice: developmental & epileptic encephalopathies (DEE) + same-gene benign counterexamples.
Edit this file to change the cluster; everything else is data-driven."""

# Core cluster: severe DEE forms (mostly no disease-modifying approved therapy)
CORE = {
    "OMIM:612164": "STXBP1",   # DEE4
    "OMIM:613721": "SCN2A",    # DEE11
    "OMIM:614558": "SCN8A",    # DEE13
    "OMIM:613720": "KCNQ2",    # DEE7
    "OMIM:614959": "KCNT1",    # DEE14
    "OMIM:612621": "SYNGAP1",  # MRD5 / SYNGAP1-DEE
    "OMIM:300672": "CDKL5",    # DEE2
    "OMIM:615473": "GNAO1",    # DEE17
}

# Counterexamples: SAME gene, different (milder) phenotype -> should NOT cluster with the core
COUNTEREXAMPLES = {
    "OMIM:607745": "SCN2A",    # Benign familial infantile seizures 3
    "OMIM:617080": "SCN8A",    # Benign familial infantile seizures 5
    "OMIM:121200": "KCNQ2",    # Benign familial neonatal seizures 1
}

# Contrast: a related DEE that HAS approved therapies (shows "what useful work exists")
CONTRAST = {
    "OMIM:607208": "SCN1A",    # Dravet syndrome
}

ALL = {**CORE, **COUNTEREXAMPLES, **CONTRAST}

# HPO frequency strings treated as "excluded/very rare" -> dropped from similarity
DROP_FREQ = {"HP:0040285"}  # Excluded (0%)
