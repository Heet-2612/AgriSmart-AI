# E12 SigLIP Validity Probe — Manifest Verification Report

**Generated:** Deterministic seed=42
**Train Manifest:** [`validity_train_manifest.csv`](file:///C:\VScode\AgriSmart-AI-integration\experiments\e12_siglip_validity\validity_train_manifest.csv) ($N=19,800$)
**Validation Manifest:** [`validity_val_manifest.csv`](file:///C:\VScode\AgriSmart-AI-integration\experiments\e12_siglip_validity\validity_val_manifest.csv) ($N=5,000$)
**Total Samples:** $N=24,800$

## 1. Class & Split Summary

| Class Name | Class Index | Train Samples | Validation Samples | Total Samples | Target Met |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Potato** | `0` | 4,000 | 1,000 | 5,000 | Yes |
| **Corn** | `1` | 4,000 | 1,000 | 5,000 | Yes |
| **Tomato** | `2` | 4,000 | 1,000 | 5,000 | Yes |
| **Apple** | `3` | 3,800 | 1,000 | 4,800 | Yes |
| **Other** | `4` | 4,000 | 1,000 | 5,000 | Yes |
| **Total** | — | **19,800** | **5,000** | **24,800** | **Yes** |

## 2. Source Composition Breakdown

### Train Manifest ($N=19,800$)

| Class Name | Domain | Source Dataset | Image Count | % of Class Train |
| :--- | :--- | :--- | :---: | :---: |
| Apple | field | Apple_FGVC7 | 1,229 | 32.3% |
| Apple | lab | PlantVillage | 2,571 | 67.7% |
| Corn | field | CCMT_Uganda | 1,200 | 30.0% |
| Corn | field | FieldPlant | 600 | 15.0% |
| Corn | field | PlantDoc_Eligible | 200 | 5.0% |
| Corn | lab | PlantVillage | 2,000 | 50.0% |
| Other | degenerate | NegativeSuite_degenerate | 50 | 1.2% |
| Other | digital_ui | NegativeSuite_digital_ui | 100 | 2.5% |
| Other | field | CCMT_Uganda | 1,225 | 30.6% |
| Other | field | FieldPlant | 400 | 10.0% |
| Other | field | PlantDoc_Eligible | 200 | 5.0% |
| Other | lab | PlantVillage | 1,825 | 45.6% |
| Other | surroundings | NegativeSuite_surroundings | 200 | 5.0% |
| Potato | field | Potato_PLD | 2,000 | 50.0% |
| Potato | lab | PlantVillage | 2,000 | 50.0% |
| Tomato | field | CCMT_Uganda | 1,000 | 25.0% |
| Tomato | field | FieldPlant | 500 | 12.5% |
| Tomato | field | PlantDoc_Eligible | 200 | 5.0% |
| Tomato | field | Taiwan_Tomato | 300 | 7.5% |
| Tomato | lab | PlantVillage | 2,000 | 50.0% |

### Validation Manifest ($N=5,000$)

| Class Name | Domain | Source Dataset | Image Count | % of Class Val |
| :--- | :--- | :--- | :---: | :---: |
| Apple | field | Apple_FGVC7 | 500 | 50.0% |
| Apple | lab | PlantVillage | 500 | 50.0% |
| Corn | field | CCMT_Uganda | 300 | 30.0% |
| Corn | field | FieldPlant | 150 | 15.0% |
| Corn | field | PlantDoc_Eligible | 50 | 5.0% |
| Corn | lab | PlantVillage | 500 | 50.0% |
| Other | degenerate | NegativeSuite_degenerate | 15 | 1.5% |
| Other | digital_ui | NegativeSuite_digital_ui | 25 | 2.5% |
| Other | field | CCMT_Uganda | 300 | 30.0% |
| Other | field | FieldPlant | 100 | 10.0% |
| Other | field | PlantDoc_Eligible | 50 | 5.0% |
| Other | lab | PlantVillage | 460 | 46.0% |
| Other | surroundings | NegativeSuite_surroundings | 50 | 5.0% |
| Potato | field | Potato_PLD | 850 | 85.0% |
| Potato | lab | PlantVillage | 150 | 15.0% |
| Tomato | field | CCMT_Uganda | 250 | 25.0% |
| Tomato | field | FieldPlant | 125 | 12.5% |
| Tomato | field | PlantDoc_Eligible | 50 | 5.0% |
| Tomato | field | Taiwan_Tomato | 75 | 7.5% |
| Tomato | lab | PlantVillage | 500 | 50.0% |

## 3. Lab vs. Field Representation

| Class Name | Train Lab / Field Ratio | Validation Lab / Field Ratio | Modalities Included |
| :--- | :---: | :---: | :--- |
| **Potato** | 2,000 lab / 2,000 field (50.0% field) | 150 lab / 850 field (85.0% field) | Lab + Wild Field |
| **Corn** | 2,000 lab / 2,000 field (50.0% field) | 500 lab / 500 field (50.0% field) | Lab + Wild Field |
| **Tomato** | 2,000 lab / 2,000 field (50.0% field) | 500 lab / 500 field (50.0% field) | Lab + Wild Field |
| **Apple** | 2,571 lab / 1,229 field (32.3% field) | 500 lab / 500 field (50.0% field) | Lab + Wild Field |
| **Other** | 4000 multi-modal | 1000 multi-modal | Lab (45%) + Field (45%) + Surroundings (5%) + UI (3.8%) + Degenerate (1.2%) |

## 4. Integrity Assertion Summary

- **58-Image Locked Audit Overlap in Train:** **0 images** (100% excluded by path and SHA-256)
- **58-Image Locked Audit Overlap in Validation:** **0 images** (100% excluded by path and SHA-256)
- **701-Image E11 PlantDoc Diagnostic Overlap in Train:** **0 images** (100% held out from training)
- **Train vs. Validation Hash Collision:** **0 images** (100% disjoint)
- **Global Deduplication:** 1,149 duplicate image files removed across candidate datasets
- **Disk Verification:** 24,800 / 24,800 files confirmed physically present and accessible
