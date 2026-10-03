import type { Kind } from "@/lib/status";

/** Plain descriptions of the controlled molecular_function vocabulary (docs/PLAN.md). Fixed text, never generated. */
export const FUNC: Record<string, { label: string; desc: string }> = {
  sodium_channel: { label: "Sodium channel", desc: "makes a sodium channel, a tiny gate that helps brain cells fire signals" },
  potassium_channel: { label: "Potassium channel", desc: "makes a potassium channel, a tiny gate that helps brain cells calm down after firing" },
  synaptic_vesicle_release: { label: "Signal release", desc: "helps brain cells release their chemical signals" },
  synaptic_signaling: { label: "Signal strength", desc: "helps brain cells tune how strongly they pass signals on" },
  kinase_signaling: { label: "On/off switch enzyme", desc: "makes an enzyme that switches other proteins on and off" },
  g_protein_signaling: { label: "Message relay", desc: "relays messages from the surface of brain cells to the inside" },
  other: { label: "Other roles", desc: "has roles in brain cells that papers describe in several ways" },
};

/** Variant effect in plain words; "reduced" covers loss of function and dominant negative. */
export const EFFECT: Record<string, { label: string; plain: string }> = {
  loss_of_function: { label: "Works less", plain: "the protein works less than it should" },
  gain_of_function: { label: "Works too much", plain: "the protein is overactive" },
  mixed: { label: "Unclear", plain: "papers disagree or the direction is unclear" },
  neutral: { label: "Not shown", plain: "no paper quote we checked states the direction yet" },
};

export const STATUS_MEANING: Record<Kind, string> = {
  ok: "Green means supported: a database records it, or a quote from a paper really says it.",
  hyp: "Amber means a hypothesis: a program worked it out from similarity, and it still needs checking.",
  conf: "Pink means expert review is needed: sources disagree, or the grouping is uncertain.",
  ctx: "Grey means context only: it is mentioned, but not counted as evidence.",
  accent: "Cyan means something you can open or do.",
};

/** HPO labels in everyday words, for the "why" lines. Anything not listed falls back to the HPO label in lower case. */
const PLAIN: Record<string, string> = {
  "Epileptic encephalopathy": "seizures that hold back development",
  "Bilateral tonic-clonic seizure": "whole-body convulsive seizures",
  "Bilateral tonic-clonic seizure with focal onset": "convulsive seizures that start in one part of the brain",
  "Focal-onset seizure": "seizures that start in one part of the brain",
  "Global developmental delay": "delays in development",
  "Neurodevelopmental abnormality": "differences in how the brain develops",
  "Interictal EEG abnormality": "unusual brain waves between seizures",
  "EEG abnormality": "unusual brain waves",
  "EEG with burst suppression": "a severe brain-wave pattern called burst suppression",
  "EEG with generalized epileptiform discharges": "seizure-like brain waves across the whole brain",
  "Interictal epileptiform activity": "seizure-like brain waves between seizures",
  "Hypsarrhythmia": "a chaotic brain-wave pattern",
  "Status epilepticus": "very long seizures",
  "Focal clonic seizure": "jerking seizures on one side of the body",
  "Focal hemiclonic seizure": "jerking seizures on one side of the body",
  "Abnormality of movement": "movement problems",
  "Involuntary movements": "movements that cannot be controlled",
  "Abnormal central motor function": "trouble controlling movement",
  "Upper motor neuron dysfunction": "trouble controlling movement",
  "Generalized-onset motor seizure": "seizures that involve the whole body",
  "Generalized-onset seizure": "seizures that involve the whole brain",
  "Dialeptic seizure": "staring seizures with no response",
  "Generalized tonic seizure": "stiffening seizures",
  "Tonic seizure": "stiffening seizures",
  "Focal tonic seizure": "stiffening seizures in one part of the body",
  "Generalized myoclonic seizure": "sudden muscle-jerk seizures",
  "Generalized clonic seizure": "rhythmic jerking seizures",
  "Focal impaired awareness seizure": "seizures with reduced awareness",
  "Motor seizure": "seizures with movement",
  "Focal motor seizure": "seizures with movement in one part of the body",
  "Non-motor seizure": "seizures without movement",
  "Generalized non-motor (absence) seizure": "brief absence seizures",
  "Febrile seizure (within the age range of 3 months to 6 years)": "seizures with fever",
  "Seizure": "seizures",
  "Developmental regression": "losing skills already learned",
  "Profound intellectual disability": "a profound learning disability",
  "Severe intellectual disability": "a severe learning disability",
  "Moderate intellectual disability": "a moderate learning disability",
  "Motor delay": "late sitting, crawling or walking",
  "Aplasia/Hypoplasia of the cerebrum": "an underdeveloped brain",
  "Hypoplasia of the corpus callosum": "a thin bridge between the two halves of the brain",
  "Brain atrophy": "loss of brain tissue",
  "Progressive microcephaly": "a head that grows more slowly than usual",
  "Spastic tetraplegia": "stiffness in the arms and legs",
  "Tetraplegia/tetraparesis": "weakness in the arms and legs",
  "Appendicular spasticity": "stiff arms and legs",
  "Dystonia": "twisting muscle contractions",
  "Autistic behavior": "autistic traits",
  "Atypical behavior": "behaviour differences",
  "Reduced eye contact": "less eye contact",
  "Abnormal pattern of respiration": "unusual breathing patterns",
  "Cerebral visual impairment": "vision problems that come from the brain",
};
export const plainPheno = (name: string) => PLAIN[name] ?? name.charAt(0).toLowerCase() + name.slice(1);

type Topic = "seizure" | "eeg" | "development" | "movement" | "brain" | "other";
const topicOf = (name: string): Topic =>
  /EEG|epileptiform|hypsarrhythmia/i.test(name) ? "eeg" : /seizure|epilep|status epilepticus/i.test(name) ? "seizure"
    : /development|intellectual|regression|delay|autis|behavio|eye contact/i.test(name) ? "development"
      : /movement|motor|spastic|dystonia|tetrapleg|ataxia/i.test(name) ? "movement" : /brain|cerebr|corpus|microcephaly/i.test(name) ? "brain" : "other";

/** "Why" line for a pair: wording follows the two most informative shared symptoms (highest information content), in plain words. */
export function whyLine(shared: { name: string; ic: number }[]) {
  const seen = new Set<string>();
  const top = [...shared].sort((a, b) => b.ic - a.ic).filter((p) => { const w = plainPheno(p.name); if (seen.has(w)) return false; seen.add(w); return true; }).slice(0, 2);
  if (!top.length) return "They overlap on a few recorded symptoms.";
  const [a, b] = top.map((p) => plainPheno(p.name));
  if (!b) return `Both are recorded with ${a}.`;
  const t = new Set(top.map((p) => topicOf(p.name)));
  if (t.size === 1 && t.has("eeg")) return `Brain-wave tests can show ${a} and ${b} in both.`;
  if (t.has("eeg")) { const [w, o] = topicOf(top[0].name) === "eeg" ? [a, b] : [b, a]; return `Both can involve ${o}, and brain-wave tests can show ${w}.`; }
  if (t.size === 1 && t.has("seizure")) return `Both can bring ${a} and ${b}.`;
  if (t.has("seizure") && t.has("development")) return `Children with either may have ${a}, along with ${b}.`;
  if (t.has("movement")) return `Both can affect movement: ${a} and ${b}.`;
  if (t.has("brain")) return `Both are linked to brain differences such as ${a} and ${b}.`;
  if (t.has("development")) return `Both affect development, with ${a} and ${b}.`;
  return `Both are recorded with ${a} and ${b}.`;
}
