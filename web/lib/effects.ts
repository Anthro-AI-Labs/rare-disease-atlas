// Mirror of pipeline/spans.py: which variant-effect classes does a sentence assert (negated/contrasted mentions ignored)?
const REDUCED = /loss[- ]of[- ](?:\w+[- ]){0,2}function|\bLoF\b|haploinsufficien|dominant[- ]negative|(?:reduc\w*|decreas\w*|impair\w*)\s(?:\S+\s){0,4}function/gi;
const INCREASED = /gain[- ]of[- ](?:\w+[- ]){0,2}function|\bGoF\b|(?:increas\w*|enhanc\w*)\s(?:\S+\s){0,4}function/gi;
const NEG = /(?:rather than|instead of|\bnot\b|\bno\b|\bnor\b|without|unlike|\bthan\b|excluding)[^.;]{0,25}$/i;
const asserted = (rx: RegExp, t: string) => [...t.matchAll(rx)].some((m) => !NEG.test(t.slice(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0)));
export const effectAssertions = (t: string) => ({ reduced: asserted(REDUCED, t), increased: asserted(INCREASED, t) });
