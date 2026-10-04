# Verification Checklist — patient_groups.csv

**Project:** Rare Disease Atlas (Hack-Nation Challenge 05)
**File checked:** `patient_groups.csv` (15 rows, 8 genes)
**AI check done:** 2026-10-04 · **Manual verification by Varduhi:** ☐ not yet done

## How to use this checklist

The golden rule: AI drafts and searches, it is never the source. Every row below was checked by AI against the live websites, but **you must open each link yourself** before the data counts as verified.

For each row:
1. Open the **Organization URL**. Confirm the site loads and the organization focuses on that gene.
2. Open the **Where to confirm** page and check the country/address.
3. Open the **Registry URL** (if any). Confirm it is a real sign-up page, not just an info page.
4. Read **Check carefully** and decide.
5. Tick the box. Once a row is verified, remove `AI-CHECKED, NOT YET MANUALLY VERIFIED.` from its `notes` in the CSV and set `date_checked` to the day you checked.

If something is wrong or unclear, write it under **My notes** and ping Amin.

---

## STXBP1

### ☐ 1. STXBP1 Foundation
- **Organization URL:** https://www.stxbp1disorders.org/
- **Gene focus:** whole site is about STXBP1-related disorders
- **Country:** United States (Holly Springs, NC)
- **Where to confirm:** https://www.stxbp1disorders.org/contact (PO Box address)
- **has_registry:** yes
- **Registry URL:** https://stxbp1.rare-x.org (RARE-X sign-up)
- **Also on the site:** Simons Searchlight and Citizen Health (listed on https://www.stxbp1disorders.org/clinicaltrialsandresearch)
- **Check carefully:** RARE-X is a data-sharing platform, not the foundation's own registry. STARR (NCT06555965) is a natural history study → goes in `assets.csv`, not here.
- **My notes:**

### ☐ 2. European STXBP1 Consortium (ESCO)
- **Organization URL:** https://stxbp1eu.org/
- **Gene focus:** STXBP1-related disorders, Europe + Israel
- **Country:** Multi-country (Belgium, Denmark, France, Germany, Israel, Italy, Netherlands, Spain)
- **Where to confirm:** https://stxbp1eu.org/members/
- **has_registry:** yes
- **Registry URL:** https://stxbp1eu.org/esco-patient-registry/
- **Check carefully:** No self-serve sign-up. Family signs a consent form, then a link goes to family and doctor (contact esco@stxbp1eu.org). Natural history study: NCT06625112. It is investigator-led — decide if it counts as a "patient group".
- **My notes:**

## SCN2A

### ☐ 3. FamilieSCN2A Foundation
- **Organization URL:** https://www.scn2a.org/
- **Gene focus:** SCN2A-related autism and epilepsy
- **Country:** United States (Gettysburg, PA)
- **Where to confirm:** homepage footer (P.O. Box 4260)
- **has_registry:** yes
- **Registry URL:** https://app.iamrare.org/home/create/?stid=119 (DRAGONFLY Study, NORD IAMRARE)
- **Check carefully:** Info page is https://scn2a.iamrare.org/ — confirm the Register link opens a sign-up form.
- **My notes:**

## SCN8A

### ☐ 4. The Cute Syndrome Foundation
- **Organization URL:** https://thecutesyndrome.com/
- **Gene focus:** SCN8A
- **Country:** United States
- **Where to confirm:** no street address on site; footer shows US 501(c)(3), EIN 46-2699066
- **has_registry:** yes
- **Registry URL:** https://redcap.uahs.arizona.edu/surveys/?s=JXAMENRMLM
- **Check carefully:** The registry is **not their own** — their research page points to the SCN8A Registry run by the Hammer Lab (University of Arizona). Same registry as row 5.
- **My notes:**

### ☐ 5. Shay Emma Hammer Research Foundation (SEHRF)
- **Organization URL:** https://shaysgift.org/
- **Gene focus:** SCN8A
- **Country:** United States (Tucson, AZ)
- **Where to confirm:** shaysgift.org (BIO5 Institute, University of Arizona)
- **has_registry:** yes
- **Registry URL:** https://redcap.uahs.arizona.edu/surveys/?s=JXAMENRMLM
- **Check carefully:** Registry portal is https://scn8a.net/ — confirm "Join the Registry" leads to the REDCap form.
- **My notes:**

## KCNQ2

### ☐ 6. KCNQ2 Cure Alliance
- **Organization URL:** https://www.kcnq2cure.org/
- **Gene focus:** KCNQ2-related disorders
- **Country:** United States (Denver, CO)
- **Where to confirm:** site footer (3700 Quebec St)
- **has_registry:** yes
- **Registry URL:** Citizen Health sign-up (`ari.citizenhealth.com/...utm_source=kcnq2`)
- **Check carefully:** ⚠️ The Citizen Health page now mainly promotes **Ari, an AI care companion**. Joining the natural history study is an optional research consent after sign-up. Decide whether to call this a "registry". Other studies on https://www.kcnq2cure.org/recruiting-research-studies/: KCNQ2 Portal & Phenotype (UTHealth) and Speech & Feeding Study (MCRI).
- **My notes:**

## KCNT1

### ☐ 7. KCNT1 Epilepsy Foundation
- **Organization URL:** https://www.kcnt1epilepsy.org/
- **Gene focus:** KCNT1-related epilepsy
- **Country:** United States (Scottsdale, AZ)
- **Where to confirm:** https://www.kcnt1epilepsy.org/kcnt1-international-registry/ (sponsor address section)
- **has_registry:** yes
- **Registry URL:** https://app.iamrare.org/home/create/?stid=154 (KCNT1 International Registry, NORD IAMRARE)
- **Check carefully:** Earlier draft said Contoocook, NH — the site says Scottsdale, AZ.
- **My notes:**

## SYNGAP1

### ☐ 8. CURE SYNGAP1 (SynGAP Research Fund)
- **Organization URL:** https://curesyngap1.org/
- **Gene focus:** SYNGAP1
- **Country:** United States (California)
- **Where to confirm:** site footer ("headquartered in California")
- **has_registry:** yes
- **Registry URL:** Citizen Health sign-up (`ari.citizenhealth.com/...utm_source=syngap1`)
- **Check carefully:** ⚠️ Same Citizen Health / Ari issue as row 6. Path: https://curesyngap1.org/join-the-registry/ → cureSYNGAP1.org/Citizen → Citizen Health page. Site also has a "Join ProMMiS" study.
- **My notes:**

> **Removed:** SYNGAP1 Foundation (syngap1foundation.org) — footer says "Permanently Closed" and registry page returns 404.

## CDKL5

### ☐ 9. International Foundation for CDKL5 Research (IFCR)
- **Organization URL:** https://cdkl5.com/
- **Gene focus:** CDKL5 Deficiency Disorder
- **Country:** United States (Wadsworth, OH)
- **Where to confirm:** https://cdkl5.com/contact (P.O. Box 926)
- **has_registry:** yes
- **Registry URL:** https://app.etapestry.com/onlineforms/InternationalFoundationforCdk/connect.html (Connect CDKL5)
- **Check carefully:** Connect CDKL5 is a **contact registry** (for surveys and trial outreach). The clinical database (ICDD) is separate: https://rettregister.telethonkids.org.au/CDKL5/Register
- **My notes:**

### ☐ 10. CDKL5 UK
- **Organization URL:** https://curecdkl5.org.uk/
- **Gene focus:** CDKL5
- **Country:** United Kingdom
- **Where to confirm:** footer (Registered Charity 1207922)
- **has_registry:** yes
- **Registry URL:** *(empty — no working sign-up link)*
- **Check carefully:** ⚠️ The sign-up link on their registry page gives an invalid-token error. The registry is run by the Orphan Disease Center, Penn: https://orphandiseasecenter.med.upenn.edu/cdkl5-deficiency-disorder-registry. That page says it is enrolling, but ClinicalTrials.gov record NCT04486768 may show **Suspended** — check it.
- **My notes:**

### ☐ 11. Australian Foundation for CDKL5 Research (AFCR)
- **Organization URL:** https://afcr.org.au/
- **Gene focus:** CDKL5 Deficiency Disorder (also other rare genetic epilepsies)
- **Country:** Australia (Geelong West, VIC)
- **Where to confirm:** homepage footer (2/84 Shannon Ave)
- **has_registry:** unknown
- **Registry URL:** *(none found)*
- **Check carefully:** "CDKL5 Australia" (cdkl5australia.com.au) may be another group — AI could not open it.
- **My notes:**

### ☐ 12. CDKL5 Alliance Francophone
- **Organization URL:** https://cdkl5.fr/
- **Gene focus:** CDKL5 (French, Belgian, Luxembourg families)
- **Country:** France (Longpont-sur-Orge)
- **Where to confirm:** https://cdkl5.fr/association-cdkl5-france/mentions-legales/
- **has_registry:** yes
- **Registry URL:** https://rettregister.telethonkids.org.au/CDKL5/Register
- **Check carefully:** Registry is **not their own** — it is the International CDKL5 Database (IFCR + Telethon Kids Institute), linked from https://cdkl5.fr/base-de-donnees-cdkl5/
- **My notes:**

## GNAO1

### ☐ 13. The Bow Foundation
- **Organization URL:** https://gnao1.org/
- **Gene focus:** GNAO1-related neurodevelopmental disorders
- **Country:** United States
- **Where to confirm:** https://gnao1.org/about-the-foundation/ (only says "headquartered in the United States")
- **has_registry:** yes
- **Registry URL:** *(empty — no sign-up link)*
- **Check carefully:** Registry exists (launched 2018, Dr. Erika Axeen, UVA), but https://gnao1.org/gnao1-international-patient-registry/ says "Update Coming Soon". Earlier draft's "Charlottesville, VA" was not on the site and was removed.
- **My notes:**

### ☐ 14. Famiglie GNAO1
- **Organization URL:** https://gnao1.it/?lang=en
- **Gene focus:** GNAO1
- **Country:** Italy
- **Where to confirm:** https://gnao1.it/famiglie-gnao1/?lang=en
- **has_registry:** unknown
- **Registry URL:** *(none found)*
- **Check carefully:** Site shows a map of families in contact, not a research registry.
- **My notes:**

### ☐ 15. Stichting GNAO1 NL
- **Organization URL:** https://gnao1.nl/
- **Gene focus:** GNAO1
- **Country:** Netherlands
- **Where to confirm:** homepage footer (KVK 68283075, ANBI registered)
- **has_registry:** unknown
- **Registry URL:** *(none found)*
- **Check carefully:** Site news (Feb 2026) cites a Dutch paper on a GNAO1 follow-up and treatment registry (doi:10.1111/dmcn.70201). Check if families can join it.
- **My notes:**

---

## Summary

| Gene | Orgs in file | Registry with sign-up link | Status |
|---|---|---|---|
| STXBP1 | 2 | 2 | ☐ |
| SCN2A | 1 | 1 | ☐ |
| SCN8A | 2 | 2 (same registry) | ☐ |
| KCNQ2 | 1 | 1 (Citizen Health ⚠️) | ☐ |
| KCNT1 | 1 | 1 | ☐ |
| SYNGAP1 | 1 | 1 (Citizen Health ⚠️) | ☐ |
| CDKL5 | 4 | 2 (UK link broken, AFCR none) | ☐ |
| GNAO1 | 3 | 0 (Bow registry has no link) | ☐ |
| **Total** | **15** | **10** | |

**Done when:** every gene has at least one manually verified group (all 8 have one), all 15 boxes are ticked, and `AI-CHECKED` is removed from verified rows.

## Open questions for Amin
1. Should Citizen Health (rows 6, 8) count as `registry` or go to `assets.csv` as `natural_history_study`?
2. Rows 4 and 12 link to registries run by other organizations — keep `has_registry = yes`, or use a separate field?
3. CDKL5 ODC registry: Suspended or enrolling? (check NCT04486768)
