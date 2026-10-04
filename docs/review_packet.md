# Review packet: evidence_review_v2.csv

Reading aid for the 24 rows, in file order. Deterministic text only: nothing here was written by a model, and no earlier verdicts or scores are shown.

**How to read it.** The sentence the claim rests on is in **bold** inside the full abstract. Tags after a word are plain keyword matches, not judgements, and can be wrong or missing: `[LoF]` loss of function, `[GoF]` gain of function, `[DN]` dominant negative, `[HUMAN]` patient or human wording, `[MODEL]` animal, cell or model wording.

**What to fill in `evidence_review_v2.csv`:** `about_this_gene`, `same_mechanism`, `human_patients` (yes/no), `verdict` (correct | partial | incorrect), `notes`, then `verified`, `verified_by`, `verified_at`. A second reviewer fills `second_verdict` and `second_by` without looking at the first verdict.

## Row 1 · GNAO1

- **Claim:** Variants in **GNAO1** have the effect: gain of function (the protein is overactive), in the disease “Developmental and epileptic encephalopathy 17”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/30682176/
- **Title:** Mouse models of GNAO1-associated movement disorder: Allele- and sex-specific differences in phenotypes.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Infants[HUMAN] and children[HUMAN] with dominant de novo[HUMAN] mutations in GNAO1 exhibit movement disorders, epilepsy, or both. Children[HUMAN] with loss-of-function[LoF] (LOF[LoF]) mutations exhibit Epileptiform Encephalopathy 17 (EIEE17). Gain-of-function[GoF] (GOF[GoF]) mutations or those with normal function are found in patients[HUMAN] with Neurodevelopmental Disorder with Involuntary Movements (NEDIM). There is no animal model[MODEL] with a human[HUMAN] mutant GNAO1 allele. Here we develop a mouse[MODEL] model[MODEL] carrying a human[HUMAN] GNAO1 mutation (G203R) and determine whether the clinical features of patients[HUMAN] with this GNAO1 mutation, which includes both epilepsy and movement disorder, would be evident in the mouse[MODEL] model[MODEL]. A mouse[MODEL] **Gnao1 knock-in[MODEL] GOF[GoF] mutation (G203R) was created by CRISPR/Cas9 methods.** The resulting offspring and littermate controls were subjected to a battery of behavioral tests. A previously reported GOF[GoF] mutant mouse[MODEL] knock-in[MODEL] (Gnao1+/G184S), which has not been found in patients[HUMAN], was also studied for comparison. Gnao1+/G203R mutant mice[MODEL] are viable and gain weight comparably to controls. Homozygotes are non-viable. Grip strength was decreased in both males and females. Male Gnao1+/G203R mice[MODEL] were strongly affected in movement assays (RotaRod and DigiGait) while females were not. Male Gnao1+/G203R mice[MODEL] also showed enhanced seizure propensity in the pentylenetetrazole kindling test. Mice[MODEL] with a G184S GOF[GoF] knock-in[MODEL] also showed movement-related behavioral phenotypes but females were more strongly affected than males. Gnao1+/G203R mice[MODEL] phenocopy children[HUMAN] with heterozygous GNAO1 G203R mutations, showing both movement disorder and a relatively mild epilepsy pattern. This mouse[MODEL] model[MODEL] should be useful in mechanistic and preclinical studies of GNAO1-related movement disorders.

---

## Row 2 · KCNT1

- **Claim:** Variants in **KCNT1** have the effect: gain of function (the protein is overactive), in the disease “Developmental and epileptic encephalopathy 14”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/37873369/
- **Title:** Heterozygous expression of a Kcnt1 gain-of-function variant has differential effects on SST- and PV-expressing cortical GABAergic neurons.
- **Other project genes mentioned in this abstract:** none

**Abstract**

More than twenty recurrent missense gain-of-function[GoF] (GOF[GoF]) mutations have been identified in the sodium-activated potassium (KNa) channel gene KCNT1 in patients[HUMAN] with severe developmental and epileptic encephalopathies (DEEs), most of which are resistant to current therapies. Defining the neuron types most vulnerable to KCNT1 GOF[GoF] will advance our understanding of disease mechanisms and provide refined targets for precision therapy efforts. Here, we assessed the effects of heterozygous expression of a Kcnt1 GOF[GoF] variant (Y777H) on KNa currents and neuronal physiology among cortical glutamatergic and GABAergic neurons in mice[MODEL], including those expressing vasoactive intestinal polypeptide (VIP), somatostatin (SST), and parvalbumin (PV), **to identify and model[MODEL] the pathogenic mechanisms of autosomal dominant KCNT1 GOF[GoF] variants in DEEs**. Although the Kcnt1-Y777H variant had no effects on glutamatergic or VIP neuron function, it increased subthreshold KNa currents[GoF] in both SST and PV neurons but with opposite effects on neuronal output; SST neurons became hypoexcitable with a higher rheobase current and lower action potential (AP) firing frequency, whereas PV neurons became hyperexcitable with a lower rheobase current and higher AP firing frequency. Further neurophysiological and computational modeling experiments showed that the differential effects of the Y777H variant on SST and PV neurons are not likely due to inherent differences in these neuron types, but to an increased persistent sodium current[GoF] in PV, but not SST, neurons. The Y777H variant also increased excitatory input onto, and chemical and electrical synaptic connectivity between, SST neurons. Together, these data suggest differential pathogenic mechanisms, both direct and compensatory, contribute to disease phenotypes, and provide a salient example of how a pathogenic ion channel variant can cause opposite functional effects in closely related neuron subtypes due to interactions with other ionic conductances.

---

## Row 3 · SCN1A

- **Claim:** Variants in **SCN1A** have the effect: loss of function (the protein works less or not at all), in the disease “Epileptic encephalopathy, early infantile, 6 (Dravet syndrome)”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42424614/
- **Title:** Persistent input- and cell-type-specific synaptic alterations in the somatosensory thalamus of Dravet syndrome mice.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Dravet syndrome (DS) is an epileptic encephalopathy **most often caused by loss-of-function[LoF] mutations in the SCN1A gene, leading to haploinsufficiency[LoF] of the voltage-gated sodium channel NaV1.1**. Seizures begin during infancy and wane throughout childhood, but behavioral symptoms, including intellectual disability, motor impairments, and autistic features, remain through adulthood. Seizures primarily stem from inhibitory neuron hypoexcitability in the cortex, hippocampus, and thalamus, but circuit abnormalities underlying persistent behavioral symptoms are poorly understood. Prior work showed synapse dysfunction in thalamocortical neurons in 4-wk-old DS mice[MODEL], but elucidating the timing and progression of these alterations is necessary to understand the disease stages that synapse dysfunction may contribute to circuit and behavioral phenotypes. We investigated synapse function in the ventral posterolateral (VPL) and ventral posteromedial (VPM) thalamus before seizure onset (P13-P17), after the period of highest seizure burden (P28-P32), and in adulthood (P58-P63). VPL and VPM synaptic activity showed that excitatory input to the VPL was reduced after seizure onset, and this reduction persisted through adulthood, while VPM excitatory input was unaffected. We further showed a selective reduction in the function[LoF] and number of excitatory sensory synapses in the VPL, with no change to cortical synapses. VPL and VPM neurons both showed inhibitory synapse dysfunction at 4 wk, which persisted in adult[HUMAN] DS mice[MODEL] only in VPL neurons. These results revealed persistent input- and cell-type-specific alterations to thalamic synapses that develop after seizure onset and are maintained into adulthood, suggesting synaptic deficits could contribute to ongoing somatosensory thalamocortical circuit dysfunction and behavioral deficits in DS.NEW & NOTEWORTHY This study reveals that synaptic dysfunction in the somatosensory thalamus of Dravet syndrome (DS) mice[MODEL] emerges after seizure onset and persists into adulthood. Using electrophysiology and high-resolution imaging, we demonstrate a selective, persistent reduction of sensory input to VPL neurons, while cortical input remains intact. Inhibitory input to VPL thalamus is similarly impaired after seizure onset and persists in adulthood. These input- and cell-type-specific deficits may contribute to the enduring sensory and sleep impairments characteristic of DS.

---

## Row 4 · SCN1A

- **Claim:** Variants in **SCN1A** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42127217/
- **Title:** Prime editing of a pathogenic Scn1a allele ameliorates seizure phenotypes in a GEFS+ mouse model.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Generalized epilepsy with febrile seizures plus (GEFS+) is an inherited epileptic disorder **predominantly linked to autosomal-dominant, loss-of-function[LoF] mutations in the sodium voltage-gated channel α subunit 1 (SCN1A) gene**, which encodes the α subunit of the neuronal voltage-gated sodium ion channel type 1 (NaV1.1). Reduced NaV1.1 function in γ-aminobutyric acid (GABA)-ergic interneurons impairs inhibitory signaling and leads to neuronal hyperexcitability. Clinically, GEFS+ is characterized by a spectrum of seizure types, often beginning with febrile seizures in early childhood and progressing to generalized tonic-clonic seizures later in life. Here, we used prime editing to correct the pathogenic SCN1A-K1270T mutation in the Scn1aKT/+ mouse[MODEL] model[MODEL] of GEFS+. Adeno-associated viral (AAV) vectors were used to deliver an intein-split prime editor under the control of a neuron-specific promoter into the cerebral ventricles of neonatal mice[MODEL]. This enabled efficient in vivo[MODEL] editing, achieving 34.7 ± 14.5% correction of the mutant allele in cortical bulk DNA, 81.2 ± 5.9% correction of mRNA, and improved multiple disease-relevant phenotypes. Survival increased from 80% in control-treated animals to 100% in treated mice[MODEL], cortical inhibitory neuron transmission was improved (frequencies of inhibitory postsynaptic currents were increased from 0.32 to 1.32 hertz), and the frequency of induced febrile seizures decreased from 78.6% to 13.3%, approaching the frequency seen in wild-type mice[MODEL] (8%). These findings suggest the therapeutic potential of prime editing for the treatment of patients[HUMAN] with SCN1A-associated GEFS+.

---

## Row 5 · SCN8A

- **Claim:** Variants in **SCN8A** have the effect: gain of function (the protein is overactive), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/39435659/
- **Title:** Parvalbumin interneuron impairment causes synaptic transmission deficits and seizures in SCN8A developmental and epileptic encephalopathy.
- **Other project genes mentioned in this abstract:** none

**Abstract**

SCN8A developmental and epileptic encephalopathy (DEE) is a severe epilepsy syndrome resulting from mutations in the voltage-gated sodium channel Nav1.6, encoded by the gene SCN8A. Nav1.6 is expressed in excitatory and inhibitory neurons, yet previous studies primarily focus on how SCN8A mutations affect excitatory neurons, with limited studies on the importance of inhibitory interneurons. Parvalbumin (PV) interneurons are a prominent inhibitory interneuron subtype that expresses Nav1.6. To assess PV interneuron function within SCN8A DEE, we used 2 mouse[MODEL] models[MODEL] **harboring patient[HUMAN]-derived SCN8A gain-of-function[GoF] variants**, Scn8aD/+, where the SCN8A variant N1768D is expressed globally, and Scn8aW/+-PV, where the SCN8A variant R1872W is selectively expressed in PV interneurons. Expression of the R1872W SCN8A variant selectively in PV interneurons led to development of spontaneous seizures and seizure-induced death. Electrophysiology studies showed that Scn8aD/+ and Scn8aW/+-PV interneurons were susceptible to depolarization block and exhibited increased persistent sodium current[GoF]. Evaluation of synaptic connections between PV interneurons and pyramidal cells showed synaptic transmission deficits in Scn8aD/+ and Scn8aW/+-PV interneurons. Together, our findings indicate that PV interneuron failure via depolarization block along with inhibitory synaptic impairment likely elicits an overall inhibitory reduction in SCN8A DEE, leading to unchecked excitation and ultimately resulting in seizures and seizure-induced death.

---

## Row 6 · STXBP1

- **Claim:** Variants in **STXBP1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/37315734/
- **Title:** Myosin Va, a Novel Interaction Partner of STXBP1, Is Required to Transport Syntaxin1A to the Plasma Membrane.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Syntaxin-binding protein 1 (STXBP1, also known as Munc18-1) regulates exocytosis as a chaperone protein of Syntaxin1A. **The haploinsufficiency[LoF] of STXBP1 causes early infantile-onset developmental and epileptic encephalopathy, known as STXBP1 encephalopathy.** Previously, we reported impaired cellular localization of Syntaxin1A in induced pluripotent stem cell-derived neurons from an STXBP1 encephalopathy patient[HUMAN] harboring a nonsense mutation. However, the molecular mechanism of abnormal Syntaxin1A localization in the haploinsufficiency[LoF] of STXBP1 remains unknown. This study aimed to identify the novel interacting partner of STXBP1 involved in transporting Syntaxin1A to the plasma membrane. Affinity purification coupled with mass spectrometry analysis identified a motor protein Myosin Va as a potential binding partner of STXBP1. Co-immunoprecipitation analysis of the synaptosomal fraction from the mouse[MODEL] and tag-fused recombinant proteins revealed that the STXBP1 short splice variant (STXBP1S) interacted with Myosin Va in addition to Syntaxin1A. These proteins colocalized at the tip of the growth cone and axons in primary cultured[MODEL] hippocampal neurons. Furthermore, RNAi-mediated gene silencing in Neuro2a cells showed that STXBP1 and Myosin Va were required for membrane trafficking of Syntaxin1A. In conclusion, this study proposes a potential role of STXBP1 in the trafficking of the presynaptic protein Syntaxin1A to the plasma membrane in conjunction with Myosin Va.

---

## Row 7 · SYNGAP1

- **Claim:** Variants in **SYNGAP1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/39111306/
- **Title:** SYNGAP1 deficiency disrupts synaptic neoteny in xenotransplanted human cortical neurons in vivo.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Human[HUMAN] brain ontogeny is characterized by a considerably prolonged neotenic development of cortical neurons and circuits. Neoteny is thought to be essential for the acquisition of advanced cognitive functions, which are typically altered in intellectual disability (ID) and autism spectrum disorders (ASDs). Human[HUMAN] neuronal neoteny could be disrupted in some forms of ID and/or ASDs, but this has never been tested. Here, we use xenotransplantation of human[HUMAN] cortical neurons into the mouse[MODEL] brain to **model[MODEL] SYNGAP1 haploinsufficiency[LoF], one of the most prevalent genetic causes of ID/ASDs.** We find that SYNGAP1-deficient human[HUMAN] neurons display strong acceleration of morphological and functional synaptic formation and maturation alongside disrupted synaptic plasticity. At the circuit level, SYNGAP1-haploinsufficient[LoF] neurons display precocious acquisition of responsiveness to visual stimulation months ahead of time. Our findings indicate that SYNGAP1 is required cell autonomously for human[HUMAN] neuronal neoteny, providing novel links between human[HUMAN]-specific developmental mechanisms and ID/ASDs.

---

## Row 8 · SYNGAP1

- **Claim:** Variants in **SYNGAP1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42362191/
- **Title:** Genetic Rescue of Disrupted Synaptic Protein Interaction Network Dynamics Following SYNGAP1 Reactivation.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Synaptic protein interaction networks (PINs) dynamically translate neural activity into biochemical signals that regulate synaptic structure and plasticity. Disruption of these coordinated networks is a common feature of autism spectrum disorder (ASD) risk genes, yet it remains unclear whether the molecular organization of a perturbed network can be restored after development. Here, we examined how post-developmental re-expression of the synaptic Ras GTPase-activating protein SynGAP1 affects network structure and signaling dynamics in a conditional **SynGAP1 haploinsufficient[LoF] mouse[MODEL]. Quantitative multiplex co-immunoprecipitation (QMI) across development revealed that SynGAP haploinsufficiency[LoF] selectively reduced SynGAP-containing complexes** without broadly disrupting NMDA-dependent network responses. Tamoxifen-inducible re-expression of SynGAP at postnatal day 21 fully restored both steady-state and activity-dependent interactions within the SynGAP module in hippocampus, and additionally normalized secondary alterations in Shank-Homer scaffolding complexes in somatosensory cortex. These data demonstrate that biochemical restoration of a disrupted synaptic network is achievable, even after early developmental windows have closed. Our findings suggest that while critical periods may constrain functional recovery, molecular network normalization remains possible through genetic reactivation of haploinsufficient[LoF] synaptic regulators.

---

## Row 9 · CDKL5

- **Claim:** Variants in **CDKL5** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/35997111/
- **Title:** CDKL5 deficiency disorder: molecular insights and mechanisms of pathogenicity to fast-track therapeutic development.
- **Other project genes mentioned in this abstract:** none

**Abstract**

CDKL5 deficiency disorder (CDD) is an X-linked brain disorder of young children[HUMAN] and is caused by pathogenic variants in the cyclin-dependent kinase-like 5 (CDKL5) gene. Individuals[HUMAN] with CDD suffer infantile onset, drug-resistant seizures, severe neurodevelopmental impairment and profound lifelong disability. The CDKL5 protein is a kinase that regulates key phosphorylation events vital to the development of the complex neuronal network of the brain. **Pathogenic variants identified in patients[HUMAN] may either result in loss of CDKL5 catalytic activity or are hypomorphic leading to partial loss of function[LoF].** Whilst the progressive nature of CDD provides an excellent opportunity for disease intervention, we cannot develop effective therapeutics without in-depth knowledge of CDKL5 function in human[HUMAN] neurons. In this mini review, we summarize new findings on the function of CDKL5. These include CDKL5 phosphorylation targets and the consequence of disruptions on signaling pathways in the human[HUMAN] brain. This new knowledge of CDKL5 biology may be leveraged to advance targeted drug discovery and rapid development of treatments for CDD. Continued development of effective humanized models[MODEL] will further propel our understanding of CDD biology and may permit the development and testing of therapies that will significantly alter CDD disease trajectory in young children[HUMAN].

---

## Row 10 · KCNQ2

- **Claim:** Variants in **KCNQ2** have the effect: gain of function (the protein is overactive), in the disease “Epileptic encephalopathy, early infantile, 7”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42591997/
- **Title:** KCNQ2 Gain-of-Function Mutation Presenting as Respiratory Dysfunction and Non-epileptic Myoclonus.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Epileptic encephalopathies are characterized by altered mental status, primarily driven by aggressive and abnormal epileptiform activities in the brain. These conditions often present with intractable seizures associated with progressive neurocognitive decline or stagnation. Mutations in the KCNQ2 gene represent one of the most common genetic causes of neonatal epileptic encephalopathies. This case report describes a rare presentation of a KCNQ2 gain-of-function[GoF] mutation associated with respiratory dysfunction and non-epileptic myoclonus. This case report describes a rare presentation of **a KCNQ2 gain-of-function[GoF] mutation associated with respiratory dysfunction and non-epileptic myoclonus, with the patient[HUMAN] exhibiting an uncommon phenotype of central hypopnea and non-epileptic, stimulus-sensitive myoclonus**.

---

## Row 11 · KCNT1

- **Claim:** Variants in **KCNT1** have the effect: gain of function (the protein is overactive), in the disease “Developmental and epileptic encephalopathy 14”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/39484453/
- **Title:** Gene therapy for targeting a prenatally enriched potassium channel associated with severe childhood epilepsy and premature death.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Dysfunction of the sodium-activated potassium channel KNa1.1 (encoded by KCNT1) is associated with a severe condition characterized by frequent seizures (up to hundreds per day) and is often fatal by age three years. We defined the early developmental onset of KNa1.1 channels in prenatal and neonatal brain tissue, establishing a timeline for pathophysiology and a window for therapeutic intervention. Using patch-clamp electrophysiology, we observed age-dependent increases in KNa1.1 K+ conductance. In neurons derived from **a child with a gain-of-function[GoF] KCNT1 pathogenic variant (p.R474H), we detected abnormal excitability** and action potential afterhyperpolarization kinetics. In a clinical trial, two individuals[HUMAN] with the p.R474H variant showed dramatic reductions in seizure occurrence and severity with a first-in-human[HUMAN] antisense oligonucleotide (ASO) RNA therapy. ASO-treated p.R474H neurons in vitro[MODEL] exhibited normalized spiking and burst properties. Finally, we demonstrated the feasibility of ASO knockdown of KNa1.1 in mid-gestation human[HUMAN] neurons, suggesting potential for early therapeutic intervention before the onset of epileptic encephalopathy.

---

## Row 12 · KCNT1

- **Claim:** Variants in **KCNT1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/36192176/
- **Title:** Somatic Mosaic Pathogenic Variant Gradient Detected in Trace Brain Tissue From Stereo-EEG Depth Electrodes.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Mosaic pathogenic variants restricted to the brain are increasingly recognized as a cause of focal epilepsies. We aimed to identify a mosaic pathogenic variant and its anatomical gradient in brain DNA derived from trace tissue on explanted stereoelectroencephalography (SEEG) electrodes. We studied a patient[HUMAN] with nonlesional multifocal epilepsy undergoing presurgical evaluation with SEEG. After explantation, the electrodes were divided into 3 pools based on their brain location (right posterior quadrant, left posterior quadrant, hippocampus/temporal neocortex). Tissue from each pool was processed for trace DNA that was whole genome amplified prior to high-depth exome sequencing. Droplet digital PCR was performed to quantify mosaicism. A brain-specific glial fibrillary acidic protein (GFAP) assay enabled cell-of-origin analysis. We demonstrated **a mosaic gradient for a novel pathogenic KCNT1 loss-of-function[LoF] variant (c.530G>A, p.W177X) predicted to lead to nonsense-mediated decay.** Strikingly, the mosaic gradient correlated strongly with the SEEG findings because the highest variant allele frequency was in the right posterior quadrant, reflecting the most epileptogenic region on EEG studies. An elevated GFAP level indicated enrichment of brain-derived cells in SEEG cell suspension. This study demonstrates a proof of concept that mosaic gradients of pathogenic variants can be established using trace tissue from explanted SEEG electrodes.

---

## Row 13 · SCN1A

- **Claim:** Variants in **SCN1A** have the effect: loss of function (the protein works less or not at all), in the disease “Epileptic encephalopathy, early infantile, 6 (Dravet syndrome)”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42495533/
- **Title:** Age-dependent axonal dysfunctions and altered sharp-wave ripple oscillations in Scn1a +/- mice.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Mice[MODEL] with Scn1a haploinsufficiency[LoF] replicate symptoms of Dravet syndrome (DS), a rare childhood disease characterized by febrile seizures at an early age. As adults[HUMAN], patients[HUMAN] with DS suffer from epilepsy, motor dysfunction, psychological disorders, and cognitive disabilities. **Patients[HUMAN] with DS carry loss-of-function[LoF] variants in the SCN1A gene, which encodes the voltage-gated sodium channel subunit NaV1.1.** As shown in mice[MODEL], this subunit is mainly expressed in GABAergic cells, especially parvalbumin-expressing interneurons (PV-INs). Consistent with this, interneuron-driven network activities, such as sharp wave ripple oscillations (SPW-R), are altered in Scn1a-deficient mice[MODEL]. By studying network and PV-IN activity during SPW-R in hippocampal slices from Scn1a +/- mice[MODEL], we identified age-dependent impairments in ripple oscillation frequencies and in rhythmic action potential (AP) firing in PV-INs, accompanied by alterations in somatic and axonal AP waveforms. This age-dependent increase in hippocampal cellular and network abnormalities may contribute to the persisting cognitive deficits associated with Scn1a haploinsufficiency[LoF].

---

## Row 14 · SCN8A

- **Claim:** Variants in **SCN8A** have the effect: gain of function (the protein is overactive), in the disease “Epileptic encephalopathy, early infantile, 13”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/38464208/
- **Title:** Parvalbumin Interneuron Impairment Leads to Synaptic Transmission Deficits and Seizures in SCN8A Epileptic Encephalopathy.
- **Other project genes mentioned in this abstract:** none

**Abstract**

SCN8A epileptic encephalopathy (EE) is a severe epilepsy syndrome resulting from de novo[HUMAN] mutations in the voltage-gated sodium channel Na v 1.6, encoded by the gene SCN8A . Na v 1.6 is expressed in both excitatory and inhibitory neurons, yet previous studies have primarily focused on the impact SCN8A mutations have on excitatory neuron function, with limited studies on the importance of inhibitory interneurons to seizure onset and progression. Inhibitory interneurons are critical in balancing network excitability and are known to contribute to the pathophysiology of other epilepsies. Parvalbumin (PV) interneurons are the most prominent inhibitory neuron subtype in the brain, making up about 40% of inhibitory interneurons. Notably, PV interneurons express high levels of Na v 1.6. To assess the role of PV interneurons within SCN8A EE, we used two mouse[MODEL] models[MODEL] harboring **patient[HUMAN]-derived SCN8A gain-of-function[GoF] mutations**, Scn8a D/+ , where the SCN8A mutation N1768D is expressed globally, and Scn8a W/+ -PV, where the SCN8A mutation R1872W is selectively expressed in PV interneurons. Expression of the R1872W SCN8A mutation selectively in PV interneurons led to the development of spontaneous seizures in Scn8a W/+ -PV mice[MODEL] and seizure-induced death, decreasing survival compared to wild-type. Electrophysiology studies showed that PV interneurons in Scn8a D/+ and Scn8a W/+ -PV mice[MODEL] were susceptible to depolarization block, a state of action potential failure. Scn8a D/+ and Scn8a W/+ -PV interneurons also exhibited increased persistent sodium current[GoF], a hallmark of SCN8A gain-of-function[GoF] mutations that contributes to depolarization block. Evaluation of synaptic connections between PV interneurons and pyramidal cells showed an increase in synaptic transmission failure at high frequencies (80-120Hz) as well as an increase in synaptic latency in Scn8a D/+ and Scn8a W/+ -PV interneurons. These data indicate a distinct impairment of synaptic transmission in SCN8A EE, potentially decreasing overall cortical network inhibition. Together, our novel findings indicate that failure of PV interneuron spiking via depolarization block along with frequency-dependent inhibitory synaptic impairment likely elicits an overall reduction in the inhibitory drive in SCN8A EE, leading to unchecked excitation and ultimately resulting in seizures and seizure-induced death.

---

## Row 15 · STXBP1

- **Claim:** Variants in **STXBP1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/30488659/
- **Title:** A de novo pathogenic CSNK1E mutation identified by exome sequencing in family trios with epileptic encephalopathy.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Recent whole-exome sequencing (WES) studies have demonstrated the contribution of de novo[HUMAN] mutations (DNMs) to epileptic encephalopathies (EEs). Here, we performed WES on four trios with West syndrome and **identified three loss-of-function[LoF] DNMs in both CSNK1E (c.885+1G>A) and STXBP1 (splicing, c.1111-2A>G; nonsense, p.(Y519X))**. The splicing mutation in CSNK1E creates insertion of 116 new amino acids at position 246 followed by a premature stop codon. Both CSNK1E and STXBP1 showed a closer coexpression relationship with epilepsy candidate genes beyond that expected by chance. In addition, genes coexpressed with CSNK1E were enriched in early prenatal stages across multiple brain regions. We also found that 60 CSNK1E-interacting genes share an association with multiple neuropsychiatric disorders, and these genes formed a significant interconnected interaction network with roles in the midbrain development. Our study supported the potential role of CSNK1E variants in EE susceptibility and expanded the phenotypic spectrum associated with CSNK1E variation.

---

## Row 16 · STXBP1

- **Claim:** Variants in **STXBP1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42768145/
- **Title:** Single cell RNA-sequencing reveals neuron type-specific vulnerabilities in a model of STXBP1-related disorder.
- **Other project genes mentioned in this abstract:** none

**Abstract**

STXBP1-related disorder (STXBP1-RD) is a severe neurodevelopmental disorder caused by **de novo[HUMAN] heterozygous mutations that lead to STXBP1 haploinsufficiency[LoF]**. STXBP1-RD is characterised by developmental delay, intellectual disability, early-onset seizures and autistic features. EEG analysis suggests excitation-inhibition (E/I) disbalance. However, STXBP1 is ubiquitously expressed in all neuron types studied so far, and it remains unknown how haploinsufficiency[LoF] leads to E/I disbalance and STXBP1-RD symptoms. Here, we used single-cell RNA-sequencing to characterize the effect of Stxbp1 haploinsufficiency[LoF] across all brain cell types in the somatosensory cortex of a validated mouse[MODEL] model[MODEL]. We observed that the relative abundance of cell types was normal. The most prominent transcriptomic changes occurred in GABAergic and glutamatergic neurons, especially Sncg interneurons and deep-layer pyramidal neurons. Astrocytes exhibited substantial changes despite not expressing STXBP1, suggesting a non-cell autonomous response. Differentially expressed genes showed little overlap between neuronal types but accumulated in synaptic and translation-related GO terms. This was accompanied by a strong trend towards reduced protein translation as measured by puromycin incorporation. Excitatory neurons showed greater synaptic dysregulation than inhibitory neurons. Notably, neuronal transcriptome changes greatly overlapped with prior proteomics STXBP1-RD data but differed radically from other disorders. Seizure burden correlated negatively in astrocytes and neurons to expression of translation-related genes. These findings identify cell-type specific vulnerabilities to STXBP1 haploinsufficiency[LoF] which may explain hyperexcitability, network dysfunction and cognition deficits in STXBP1-RD. Overall, our study provides a cellular-resolution map of the transcriptomic changes in STXBP1-related disorders, providing potential new therapeutic targets.

---

## Row 17 · GNAO1

- **Claim:** Variants in **GNAO1** have the effect: gain of function (the protein is overactive), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/37001522/
- **Title:** In-depth molecular profiling of an intronic GNAO1 mutant as the basis for personalized high-throughput drug screening.
- **Other project genes mentioned in this abstract:** none

**Abstract**

The GNAO1 gene, encoding the major neuronal G protein Gαo, is mutated in a subset of pediatric encephalopathies. Most such mutations consist of missense variants. In this study, we present a precision medicine workflow combining next-generation sequencing (NGS) diagnostics, molecular etiology analysis, and personalized drug discovery. We describe a patient[HUMAN] carrying a de novo[HUMAN] intronic mutation (NM_020988.3:c.724-8G>A), leading to epilepsy-negative encephalopathy with motor dysfunction from the second decade. Our data show that this mutation creates a novel splice acceptor site that in turn causes an in-frame insertion of two amino acid residues, Pro-Gln, within the regulatory switch III region of Gαo. This insertion misconfigures the switch III loop and creates novel interactions with the catalytic switch II region, **resulting in increased GTP uptake, defective GTP hydrolysis, and aberrant interactions with effector proteins.** In contrast, intracellular localization, Gβγ interactions, and G protein-coupled receptor (GPCR) coupling of the Gαo[insPQ] mutant protein remain unchanged. This in-depth analysis characterizes the heterozygous c.724-8G>A mutation as partially dominant negative[DN], providing clues to the molecular etiology of this specific pathology. Further, this analysis allows us to establish and validate a high-throughput screening platform aiming at identifying molecules that could correct the aberrant biochemical functions of the mutant Gαo. This work was supported by the Joint Seed Money Funding scheme between the University of Geneva and the Hebrew University of Jerusalem.

---

## Row 18 · KCNQ2

- **Claim:** Variants in **KCNQ2** have the effect: an effect on the protein whose direction is not stated, in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/40884527/
- **Title:** Long-term outcomes of a cohort of patients with pharmacoresistant neonatal epilepsy and negative brain MRI.
- **Other project genes mentioned in this abstract:** KCNT1 (1×), STXBP1 (1×)

**Abstract**

Neonatal seizures initiate the onset of epilepsy in less than 20% of cases. Establishing accurate and prompt diagnosis for precision medicine, offering tailored care, and informing families[HUMAN] about neurodevelopmental prognosis represents a significant challenge. We aim to describe the natural history of drug-resistant epilepsy and negative brain MRI with neonatal onset, and to identify predictors of neurodevelopmental outcomes. We retrospectively analyzed demographic, clinical, electroencephalogram (EEG), and genetic data from neonates with epilepsy onset before 1 month of age, with no provoked cause, and a normal brain MRI, followed at a tertiary center from 2000 to 2020. Neonates with self-limited epilepsy (SLE) or those responding to phenobarbital without later epilepsy were excluded. Among 56 patients[HUMAN], 60% had a genetic etiology (KCNQ2, STXBP1, KCNT1, others). Most (96%) developed intellectual disability (ID); moderate ID without cerebral palsy (CP) was recorded in 11, and profound intellectual and multiple disabilities (PIMD) in 42. Only two patients[HUMAN] had a favorable neurodevelopmental outcome without intellectual disability. An abnormal neurological exam at epilepsy onset was the sole risk factor for future PIMD. **Neonatal-onset pharmacoresistant epilepsies with a normal brain MRI are predominantly monogenic and lead to poor neurodevelopmental outcomes.** An abnormal initial neurodevelopmental assessment predicts future PIMD. Our study found that epilepsy starting in the neonatal period is often linked to a strong genetic component. The prognosis is generally poor, with frequent neurodevelopmental delays. An abnormal neurological examination during the neonatal period is a predictor of worse outcomes.

---

## Row 19 · KCNQ2

- **Claim:** Variants in **KCNQ2** have the effect: gain of function (the protein is overactive), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42611988/
- **Title:** An upstream open reading frame represses translation of the neuronal potassium channel KCNQ2.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Upstream open reading frames (uORFs) within the 5'-untranslated region (5'-UTR) of messenger RNA transcripts can regulate protein translation. Despite widespread prevalence within the human[HUMAN] genome, they remain unidentified for many clinically relevant genes. A gene frequently associated with neonatal-onset epilepsy is KCNQ2, which encodes a neuronal voltage-gated potassium channel subunit that functions to dampen neuronal excitability. Heterozygous loss-of-function[LoF] pathogenic KCNQ2 variants are known to cause a range of neurodevelopmental disorders and epileptic encephalopathies, but there remains an unmet clinical need for patients[HUMAN] harboring these variants. We identified a single uORF in KCNQ2 that is highly repressive of protein translation and demonstrated that **mutations disabling the uORF start codon enhance synthesis of encoded potassium channels**. Additionally, we show that adenine base editing of the uORF start codon can weaken ribosome engagement at the uORF and enhance translation of the protein in a neuron-like cell line[MODEL]. This study establishes a previously underexplored regulatory feature for KCNQ2 and highlights the importance of understanding uORFs for clinically relevant genes, both for assessing disease risk and therapeutic potential.

---

## Row 20 · KCNQ2

- **Claim:** Variants in **KCNQ2** have the effect: loss of function (the protein works less or not at all), in the disease “Seizures, benign familial neonatal, 1”.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/42610455/
- **Title:** Early sodium channel blocker initiation is associated with better outcomes in KCNQ2 disorders.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Pathogenic KCNQ2 variants are the most common genetic cause of neonatal-onset epilepsies, with phenotypes ranging from self-limited (familial) neonatal epilepsy (SeL(F)NE) to severe developmental and epileptic encephalopathy (KCNQ2-DEE). Sodium channel blockers (SCBs) have shown promise for seizure control in these disorders, but their impact on neurodevelopmental outcomes and possible relationship with timing of initiation remain incompletely understood. We leveraged a large, multicentre international cohort[HUMAN] comprising 282 individuals[HUMAN] with pathogenic KCNQ2 variants to retrospectively assess the effectiveness of antiseizure medications (ASMs), particularly SCBs, on seizure control and neurodevelopment. Individuals[HUMAN] were grouped according to the predicted variant-specific functional effects: loss-of-function[LoF] (LOF[LoF]) variants known to be associated with SeL(F)NE or DEE respectively, and gain-of-function[GoF] (GOF[GoF]) variants. Epilepsy course, ASM effectiveness, and neurodevelopmental milestones were systematically collected and analysed, including time-to-event and adjusted outcome analyses. **SCBs, especially carbamazepine (CBZ) and oxcarbazepine (OXC), emerged as the most effective ASMs in both LOF[LoF] groups.** In LOF[LoF] KCNQ2-DEE, time-to-event analyses showed that early SCB initiation (≤1 month) was associated with earlier seizure offset. Early SCB initiation was also associated with significantly more favourable neurodevelopmental outcomes, including higher rates of attaining major motor milestones. This association remained significant after adjustment for seizure control by 1 month and total ASM burden. Considerable phenotypic variability persisted, with some individuals[HUMAN] experiencing severe impairment despite early seizure control and SCB initiation, suggesting that variant severity and additional genetic or biological modifiers contribute to outcome heterogeneity.Our results support the use of SCBs, particularly CBZ and OXC, as first-line therapy in (LOF[LoF]) KCNQ2-DEE and SeL(F)NE. Earlier SCB initiation was associated with earlier seizure offset and more favourable developmental outcomes, underscoring the importance of early genetic diagnosis and timely SCB therapy. We however emphasise that early treatment is not universally transformative and further prospective work, including exploration of targeted therapies and standardised neurodevelopmental assessments, is needed to optimise long-term outcomes in this heterogeneous population.

---

## Row 21 · SCN2A

- **Claim:** Variants in **SCN2A** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/41724236/
- **Title:** Autism-related phenotypes in a heterozygous Scn2aR854Q mouse model and their partial rescue via a potassium channel opener.
- **Other project genes mentioned in this abstract:** none

**Abstract**

The voltage-gated sodium channel NaV1.2 is frequently implicated in neurodevelopmental and neurological disorders, including developmental and epileptic encephalopathy (DEE) and autism spectrum disorder (ASD). Genotype-phenotype studies show that NaV1.2 mutations with mixed gain- (GoF[GoF]) and loss-of-function[LoF] (LoF[LoF]) effects are associated with the most severe clinical outcomes. The R853Q mutation in the second gating charge of Domain II decreases current[LoF] density by 50-60% and was initially classified as a LoF[LoF] mutation, likely resulting in reduced neuronal firing. However, this does not fully explain its recurrent association with DEE and severe forms of ASD. Our recent findings indicate that R853Q induces a gating pore current (Igp) in the resting state, introducing a GoF[GoF] component that may increase cortical neuronal excitability. This mixed GoF[GoF]/LoF[LoF] effect may underlie the strong clinical phenotypes observed in patients[HUMAN] carrying this mutation. To explore this, we generated a mouse[MODEL] model[MODEL] carrying the orthologous R854Q mutation and performed an initial characterization of this model[MODEL]. Behavioral analyses revealed that heterozygous NaV1.2(R854Q) mice[MODEL] exhibit ASD-like phenotypes, including impaired social interaction and social novelty, repetitive rearing, and increased risk-taking behaviors. In silico modeling suggests that, in cortical neurons, **the net effect of the R854Q mutation is a reduction in neuronal excitability due to decreased sodium conductance**, although Igp alone increases excitability and partially offsets this reduction. Notably, acute administration of retigabine, a potassium channel opener, rescues specific ASD-related phenotypes, possibly by restoring decreased firing through reduction of slow sodium inactivation. Comparative analysis with Scn2a knockout[MODEL] models[MODEL], which show similar current reduction, highlights the unique severity of R854Q, suggesting a role of Igp in modulating neurobehavioral outcomes and informing potential therapeutic strategies.

---

## Row 22 · SCN2A

- **Claim:** Variants in **SCN2A** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/40887751/
- **Title:** Sex-Specific Behavioral Features of Juvenile and Adult Haploinsufficient Scn2a+/- Female Mice, Model of Autism Spectrum Disorder.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Genetic variants of the **SCN2A gene, encoding the NaV1.2 sodium channel, cause a spectrum of neurodevelopmental and epileptic disorders**, and are among those that show the strongest association with Autism Spectrum Disorder (ASD). ASD has a male-bias prevalence, but several studies have proposed that female prevalence may be underestimated due to different symptomatic expression compared with males. However, it is unclear whether this is related to actual different pathological features or to greater masking abilities in females. Studies on Scn2a+/- mice[MODEL], a model[MODEL] of SCN2A haploinsufficiency[LoF] and ASD, have shown an age-dependent ASD-like phenotype attenuated at adulthood in males. However, little is known about the behavioral features of Scn2a+/- female mice[MODEL]. We performed a battery of behavioral tests that are relevant for assessing ASD-like features, investigating juvenile and adult[HUMAN] Scn2a+/- female mice[MODEL]. Our results demonstrate that female Scn2a+/- mice[MODEL] exhibit an overall milder phenotype than males, showing increased risk-taking in juveniles, hyper-reactivity to cold stimuli, and mild memory impairments in adults[HUMAN], abnormally increased sociability, and altered decision-making related behaviors in both juveniles and adults[HUMAN]. Thus, this aligns with the male-biased prevalence of ASD and supports the existence of sex-specific phenotypic differences, potentially arising from distinct underlying pathophysiological mechanisms. Both sexes should be investigated in studies of mouse[MODEL] models[MODEL] of ASD.

---

## Row 23 · SCN2A

- **Claim:** Variants in **SCN2A** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/31501495/
- **Title:** NaV1.2 haploinsufficiency in Scn2a knock-out mice causes an autistic-like phenotype attenuated with age.
- **Other project genes mentioned in this abstract:** none

**Abstract**

Mutations of the SCN2A gene, encoding the voltage gated sodium channel NaV1.2, have been associated to a wide spectrum of epileptic disorders ranging from benign familial neonatal-infantile seizures to early onset epileptic encephalopathies such as Ohtahara syndrome. These phenotypes may be caused by either gain-of-function[GoF] or loss-of-function[LoF] mutations. More recently, loss-of-function[LoF] SCN2A mutations have also been identified in patients[HUMAN] with autism spectrum disorder (ASD) without overt epileptic phenotypes. Heterozygous Scn2a knock-out[MODEL] mice[MODEL] (Scn2a+/-) may be a model[MODEL] of this phenotype. Because ASD develops in childhood, we performed a detailed behavioral characterization of Scn2a+/- mice[MODEL] comparing the juvenile/adolescent period of development and adulthood. We used tasks relevant to ASD and the different comorbidities frequently found in this disorder, such as anxiety or intellectual disability. Our data demonstrate that **young Scn2a+/- mice[MODEL] display autistic-like phenotype associated to impaired memory and reduced reactivity to stressful stimuli.** Interestingly, these dysfunctions are attenuated with age since adult[HUMAN] mice[MODEL] show only communicative deficits. Considering the clinical data available on patients[HUMAN] with loss-of-function[LoF] SCN2A mutations, our results indicate that Scn2a+/- mice[MODEL] constitute an ASD model[MODEL] with construct and face validity during the juvenile/adolescent period of development. However, more information about the clinical features of adult[HUMAN] carriers of SCN2A mutations is needed to evaluate comparatively the phenotype of adult[HUMAN] Scn2a+/- mice[MODEL].

---

## Row 24 · SYNGAP1

- **Claim:** Variants in **SYNGAP1** have the effect: loss of function (the protein works less or not at all), in an unspecified disease.
- **PubMed:** https://pubmed.ncbi.nlm.nih.gov/37786701/
- **Title:** Context-dependent hyperactivity in syngap1a and syngap1b zebrafish autism models.
- **Other project genes mentioned in this abstract:** none

**Abstract**

SYNGAP1 disorder is a prevalent genetic form of Autism Spectrum Disorder and Intellectual Disability (ASD/ID) and is caused by de novo[HUMAN] or inherited mutations in one copy of the SYNGAP1 gene. In addition to ASD/ID, SYNGAP1 disorder is associated with comorbid symptoms including treatment-resistant-epilepsy, sleep disturbances, and gastrointestinal distress. Mechanistic links between these diverse symptoms and SYNGAP1 variants remain obscure, therefore, our goal was to generate a zebrafish[MODEL] model[MODEL] in which this range of symptoms can be studied. We used CRISPR/Cas9 to introduce frameshift mutations in the syngap1a and syngap1b zebrafish[MODEL] duplicates (syngap1ab) and validated these stable models[MODEL] for Syngap1 loss-of-function[LoF]. Because SYNGAP1 is extensively spliced, we mapped splice variants to the two zebrafish[MODEL] syngap1a and b genes and identified mammalian-like isoforms. We then quantified locomotory behaviors in zebrafish[MODEL] syngap1ab larvae under three conditions that normally evoke different arousal states in wild type larvae: aversive, high-arousal acoustic, medium-arousal dark, and low-arousal light stimuli. We show that CRISPR/Cas9 indels in zebrafish[MODEL] syngap1a and syngap1b produced loss-of-function[LoF] alleles at RNA and protein levels. Our analyses of zebrafish[MODEL] Syngap1 isoforms showed that, as in mammals, zebrafish[MODEL] Syngap1 N- and C-termini are extensively spliced. We identified a zebrafish[MODEL] syngap1 α1-like variant that maps exclusively to the syngap1b gene. Quantifying locomotor behaviors showed that syngap1ab larvae are hyperactive[GoF] compared to wild type but to differing degrees depending on the stimulus. Hyperactivity[GoF] was most pronounced in low arousal settings, with overall movement increasing with the number of mutant syngap1 alleles. **Our data support mutations in zebrafish[MODEL] syngap1ab as causal for hyperactivity[GoF] associated with elevated arousal** that is especially pronounced in low-arousal environments.

---
