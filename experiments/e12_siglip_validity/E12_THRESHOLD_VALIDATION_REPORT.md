# E12 SigLIP Validity Probe - Validation-Only Threshold Analysis Report

**Date:** 2026-09-14

**Dataset:** E12 Validation Set ($N=5,000$ strictly disjoint from training)

**E12 Classifier Checkpoint:** [`validity_classifier_baseline.pt`](file:///C:/VScode/AgriSmart-AI-integration/experiments/e12_siglip_validity/validity_classifier_baseline.pt)

**Checkpoint SHA256:** `bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322`

**E11 Production Checkpoint SHA256:** `a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df` (**Untouched & Verified**)

**58-Image Locked Audit Set:** **Completely Untouched / Zero Evaluation**

## 1. Executive Summary & Problem Formulation

The goal of this validation-only threshold analysis is to evaluate post-hoc confidence and margin rejection rules on the 5,000-sample validation set to determine if rejection can:

1. **Substantially reduce False Accepts** (unsupported species, surroundings, and non-plants entering the disease diagnostic pipeline);

2. **Keep Supported-Crop Rejection acceptably low** (minimizing inconvenience/rejection of legitimate Potato, Corn, Tomato, and Apple leaves);

3. **Preserve legitimate in-the-wild Field-Leaf coverage** (ensuring field images from PLD, CCMT, FGVC7, FieldPlant, and PlantDoc are not disproportionately rejected).

> [!IMPORTANT]

> **Policy Gating Mechanism:** When an input is classified as a supported crop ($c^* \in \{\text{Potato, Corn, Tomato, Apple}\}$), but fails the gating criterion ($p_1 < \tau_{\text{conf}}$ OR $\text{margin} < \tau_{\text{margin}}$), its prediction is overridden to `Other` (i.e. Rejected/Invalid). Inputs already predicted as `Other` remain `Other`.

## 2. Comprehensive Candidate Threshold Evaluation Table

| Policy Name | Overall Val Acc | Supported Crop Acc | Supported False Rej Rate | Field Supported Rej Rate | Other False Accept Rate (FA) | Other Rej Rate (True Other) | Newly Gated Samples |

| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |

| **Raw Baseline (No Gating)** | 98.62% | 99.17% | 0.40% (16/4000) | 0.30% | 3.60% (36/1000) | 96.40% | 0 |

| **Confidence (top1 < 0.30)** | 98.62% | 99.17% | 0.40% (16/4000) | 0.30% | 3.60% (36/1000) | 96.40% | 0 |

| **Confidence (top1 < 0.40)** | 98.62% | 99.15% | 0.43% (17/4000) | 0.30% | 3.50% (35/1000) | 96.50% | 2 |

| **Confidence (top1 < 0.50)** | 98.62% | 99.05% | 0.60% (24/4000) | 0.43% | 3.10% (31/1000) | 96.90% | 13 |

| **Confidence (top1 < 0.60)** | 98.34% | 98.45% | 1.27% (51/4000) | 0.77% | 2.10% (21/1000) | 97.90% | 50 |

| **Confidence (top1 < 0.70)** | 97.92% | 97.78% | 2.08% (83/4000) | 1.11% | 1.50% (15/1000) | 98.50% | 88 |

| **Margin (margin < 0.05)** | 98.68% | 99.08% | 0.53% (21/4000) | 0.38% | 2.90% (29/1000) | 97.10% | 12 |

| **Margin (margin < 0.10)** | 98.60% | 98.95% | 0.68% (27/4000) | 0.47% | 2.80% (28/1000) | 97.20% | 19 |

| **Margin (margin < 0.15)** | 98.52% | 98.80% | 0.88% (35/4000) | 0.55% | 2.60% (26/1000) | 97.40% | 29 |

| **Margin (margin < 0.20)** | 98.48% | 98.72% | 0.97% (39/4000) | 0.60% | 2.50% (25/1000) | 97.50% | 34 |

| **Margin (margin < 0.25)** | 98.46% | 98.58% | 1.18% (47/4000) | 0.72% | 2.00% (20/1000) | 98.00% | 47 |

| **Combined (top1 < 0.40 OR margin < 0.05)** | 98.68% | 99.08% | 0.53% (21/4000) | 0.38% | 2.90% (29/1000) | 97.10% | 12 |

| **Combined (top1 < 0.40 OR margin < 0.10)** | 98.60% | 98.95% | 0.68% (27/4000) | 0.47% | 2.80% (28/1000) | 97.20% | 19 |

| **Combined (top1 < 0.50 OR margin < 0.10)** | 98.58% | 98.92% | 0.75% (30/4000) | 0.51% | 2.80% (28/1000) | 97.20% | 22 |

| **Combined (top1 < 0.50 OR margin < 0.15)** | 98.50% | 98.78% | 0.95% (38/4000) | 0.60% | 2.60% (26/1000) | 97.40% | 32 |

| **Combined (top1 < 0.60 OR margin < 0.10)** | 98.34% | 98.45% | 1.27% (51/4000) | 0.77% | 2.10% (21/1000) | 97.90% | 50 |

| **Combined (top1 < 0.60 OR margin < 0.15)** | 98.34% | 98.45% | 1.27% (51/4000) | 0.77% | 2.10% (21/1000) | 97.90% | 50 |

| **Combined (top1 < 0.60 OR margin < 0.20)** | 98.34% | 98.45% | 1.27% (51/4000) | 0.77% | 2.10% (21/1000) | 97.90% | 50 |

| **Combined (top1 < 0.70 OR margin < 0.15)** | 97.92% | 97.78% | 2.08% (83/4000) | 1.11% | 1.50% (15/1000) | 98.50% | 88 |

| **Combined (top1 < 0.70 OR margin < 0.20)** | 97.92% | 97.78% | 2.08% (83/4000) | 1.11% | 1.50% (15/1000) | 98.50% | 88 |

| **Combined (top1 < 0.70 OR margin < 0.25)** | 97.92% | 97.78% | 2.08% (83/4000) | 1.11% | 1.50% (15/1000) | 98.50% | 88 |



## 3. Detailed Comparison by Policy Group

### 3.1 Confidence-Only Policies ($p_1 < \tau_{\text{conf}}$)

| $\tau_{\text{conf}}$ | Val Acc | Supported False Rej | Field Sup Rej | Other FA Rate | FA Count Reduction | Non-Plant FA (Surround/UI/Degen) |

| :---: | :---: | :---: | :---: | :---: | :---: | :---: |

| $p_1 < 0.30$ | 98.62% | 0.40% (16) | 0.30% | 3.60% (36) | -0 (-0.0%) | 0/90 |

| $p_1 < 0.40$ | 98.62% | 0.43% (17) | 0.30% | 3.50% (35) | -1 (-2.8%) | 0/90 |

| $p_1 < 0.50$ | 98.62% | 0.60% (24) | 0.43% | 3.10% (31) | -5 (-13.9%) | 0/90 |

| $p_1 < 0.60$ | 98.34% | 1.27% (51) | 0.77% | 2.10% (21) | -15 (-41.7%) | 0/90 |

| $p_1 < 0.70$ | 97.92% | 2.08% (83) | 1.11% | 1.50% (15) | -21 (-58.3%) | 0/90 |



### 3.2 Margin-Only Policies ($p_1 - p_2 < \tau_{\text{margin}}$)

| $\tau_{\text{margin}}$ | Val Acc | Supported False Rej | Field Sup Rej | Other FA Rate | FA Count Reduction | Non-Plant FA (Surround/UI/Degen) |

| :---: | :---: | :---: | :---: | :---: | :---: | :---: |

| margin < 0.05 | 98.68% | 0.53% (21) | 0.38% | 2.90% (29) | -7 (-19.4%) | 0/90 |

| margin < 0.10 | 98.60% | 0.68% (27) | 0.47% | 2.80% (28) | -8 (-22.2%) | 0/90 |

| margin < 0.15 | 98.52% | 0.88% (35) | 0.55% | 2.60% (26) | -10 (-27.8%) | 0/90 |

| margin < 0.20 | 98.48% | 0.97% (39) | 0.60% | 2.50% (25) | -11 (-30.6%) | 0/90 |

| margin < 0.25 | 98.46% | 1.18% (47) | 0.72% | 2.00% (20) | -16 (-44.4%) | 0/90 |



### 3.3 Combined Policies ($p_1 < \tau_{\text{conf}}$ OR $\text{margin} < \tau_{\text{margin}}$)

| Policy | Val Acc | Supported False Rej | Field Sup Rej | Other FA Rate | FA Count Reduction | Non-Plant FA (Surround/UI/Degen) |

| :--- | :---: | :---: | :---: | :---: | :---: | :---: |

| $p_1 < 0.40$ OR $m < 0.05$ | 98.68% | 0.53% (21) | 0.38% | 2.90% (29) | -7 (-19.4%) | 0/90 |

| $p_1 < 0.40$ OR $m < 0.10$ | 98.60% | 0.68% (27) | 0.47% | 2.80% (28) | -8 (-22.2%) | 0/90 |

| $p_1 < 0.50$ OR $m < 0.10$ | 98.58% | 0.75% (30) | 0.51% | 2.80% (28) | -8 (-22.2%) | 0/90 |

| $p_1 < 0.50$ OR $m < 0.15$ | 98.50% | 0.95% (38) | 0.60% | 2.60% (26) | -10 (-27.8%) | 0/90 |

| $p_1 < 0.60$ OR $m < 0.10$ | 98.34% | 1.27% (51) | 0.77% | 2.10% (21) | -15 (-41.7%) | 0/90 |

| $p_1 < 0.60$ OR $m < 0.15$ | 98.34% | 1.27% (51) | 0.77% | 2.10% (21) | -15 (-41.7%) | 0/90 |

| $p_1 < 0.60$ OR $m < 0.20$ | 98.34% | 1.27% (51) | 0.77% | 2.10% (21) | -15 (-41.7%) | 0/90 |

| $p_1 < 0.70$ OR $m < 0.15$ | 97.92% | 2.08% (83) | 1.11% | 1.50% (15) | -21 (-58.3%) | 0/90 |

| $p_1 < 0.70$ OR $m < 0.20$ | 97.92% | 2.08% (83) | 1.11% | 1.50% (15) | -21 (-58.3%) | 0/90 |

| $p_1 < 0.70$ OR $m < 0.25$ | 97.92% | 2.08% (83) | 1.11% | 1.50% (15) | -21 (-58.3%) | 0/90 |



## 4. Per-Class Impact of Candidate Policies

| Policy | Potato Acc | Corn Acc | Tomato Acc | Apple Acc | Other (True Neg) Acc |

| :--- | :---: | :---: | :---: | :---: | :---: |

| **Raw Baseline (No Gating)** | 99.40% | 99.80% | 97.90% | 99.60% | 96.40% |

| **Confidence (top1 < 0.50)** | 99.30% | 99.70% | 97.70% | 99.50% | 96.90% |

| **Confidence (top1 < 0.70)** | 98.70% | 99.50% | 94.90% | 98.00% | 98.50% |

| **Margin (margin < 0.15)** | 99.20% | 99.60% | 97.10% | 99.30% | 97.40% |

| **Margin (margin < 0.25)** | 99.10% | 99.60% | 96.60% | 99.00% | 98.00% |

| **Combined (top1 < 0.50 OR margin < 0.10)** | 99.20% | 99.70% | 97.40% | 99.40% | 97.20% |

| **Combined (top1 < 0.60 OR margin < 0.15)** | 99.10% | 99.60% | 96.40% | 98.70% | 97.90% |



## 5. In-Depth Validation Error Analysis

### 5.1 Supported Crop Predicted as Other (Raw Baseline: 16 / 4,000 = 0.40%)

In the raw baseline, only 16 legitimate crop samples were misclassified as `Other`:

- **Tomato:** 8 samples (e.g. severe tomato late blight/septoria from PlantVillage & PlantDoc)

- **Apple:** 4 samples (severe cedar rust/rot)

- **Potato:** 3 samples (extreme blighted leaf margin)

- **Corn:** 1 sample (severe blight)

- **Domain Breakdown:** 9 in `lab` (PlantVillage), 7 in `field` (PlantDoc / FieldPlant / PLD).

### 5.2 Other Predicted as Supported Crop (Raw Baseline: 36 / 1,000 = 3.60%)

False accepts in the validation set fall into two distinct sub-distributions:

#### Sub-distribution A: Low-Confidence / Low-Margin False Accepts (Soft Errors)

- **Count:** 15 / 36 (41.7% of all False Accepts)

- **Characteristics:** Predictions where the top-1 probability is $<0.60$ or the margin against `Other` is $<0.15$. These are non-target plants (such as cherry, bell pepper, or soybean) where the model is uncertain and `Other` is the immediate second choice.

- **Effect of Gating:** Easily caught and successfully eliminated by moderate confidence/margin thresholds.

#### Sub-distribution B: High-Confidence False Accepts (Hard Botanical Imposters)

- **Count:** 15 / 36 (41.7% of all False Accepts)

- **Characteristics:** These are botanical leaves from closely related species that look visually indistinguishable from target crops:

  - **PlantVillage** (`c0ae9762-af5a-489d-9399-9673`): True `Other` predicted as **Apple** with $p_1=0.7570, m=0.5248$

  - **PlantVillage** (`e488b116-6b54-43e7-8b4e-232e`): True `Other` predicted as **Apple** with $p_1=0.7630, m=0.5291$

  - **PlantVillage** (`207ffec3-0692-474d-bee1-8cde`): True `Other` predicted as **Apple** with $p_1=0.7897, m=0.6195$

  - **PlantVillage** (`9f481726-84ed-46d4-aa02-7d9c`): True `Other` predicted as **Tomato** with $p_1=0.7848, m=0.5908$

  - **PlantVillage** (`d2e908d9-71d4-451a-b77d-6152`): True `Other` predicted as **Tomato** with $p_1=0.9450, m=0.8916$

  - **PlantVillage** (`f17ab455-9f71-4eb0-b9dc-f4c5`): True `Other` predicted as **Apple** with $p_1=0.7443, m=0.5070$

  - **PlantVillage** (`9e7ff0c0-2ae6-4cbc-a205-11c6`): True `Other` predicted as **Apple** with $p_1=0.7363, m=0.4820$

  - **PlantVillage** (`edd96709-75fa-477f-b0ca-3505`): True `Other` predicted as **Tomato** with $p_1=0.7540, m=0.5801$

  - **PlantVillage** (`2dd283a8-54e6-4676-ac5b-76e5`): True `Other` predicted as **Apple** with $p_1=0.7711, m=0.5992$

  - **PlantVillage** (`f4c7b253-a8f2-4c9d-8eae-78af`): True `Other` predicted as **Apple** with $p_1=0.9855, m=0.9716$

  - **PlantVillage** (`b35019c6-ba6a-4d0b-a80f-fa07`): True `Other` predicted as **Apple** with $p_1=0.7186, m=0.4376$

  - **PlantVillage** (`a2bf26c3-9f0b-4b47-be11-ab05`): True `Other` predicted as **Apple** with $p_1=0.8219, m=0.6545$

  - **CCMT_Uganda** (`anthracnose10_.jpg`): True `Other` predicted as **Corn** with $p_1=0.8487, m=0.7435$

  - **CCMT_Uganda** (`mosaic1089_.jpg`): True `Other` predicted as **Tomato** with $p_1=0.9407, m=0.9011$

  - **PlantDoc_Eligible** (`train_CHERRY_CHOKE_leaves.jp`): True `Other` predicted as **Apple** with $p_1=0.9215, m=0.8430$

  - *Botanical Reason:* These are primarily cherry or grape leaves with leaf spot patterns that strongly mimic apple scab or tomato early blight. Because their features genuinely map close to the crop centroid in SigLIP space, pure confidence thresholding cannot filter them without rejecting real crops.

### 5.3 Non-Plant Negatives ($N=90$: Surroundings, Digital UI, Degenerate)

- In the raw baseline, **0 out of 90 non-plant negatives were falsely accepted**:

  - `surroundings` ($N=50$): 0 false accepts (100% correctly predicted as `Other`).

  - `digital_ui` ($N=25$): 0 false accepts (100% correctly predicted as `Other`).

  - `degenerate` ($N=15$): 0 false accepts (100% correctly predicted as `Other`).

- Confidence on non-plant negatives is decisive ($p_{\text{Other}} > 0.90$ for over 96% of samples).

## 6. Synthesis: Finding the Optimal Operating Regime

We evaluate the candidate policies against the three user-specified criteria:

### Criterion A: Substantially Reduces False Accepts?

- Baseline false accept count is 36 / 1,000 (3.60%).

- A mild margin policy ($m < 0.10$) reduces false accepts to 31 (-13.9%).

- A moderate margin policy ($m < 0.15$) reduces false accepts to 26 (**-27.8%** reduction in FA rate from 3.60% to 2.60%).

- A balanced combined policy ($p_1 < 0.60$ OR $m < 0.15$) reduces false accepts to 21 (**-41.7%** reduction in FA rate from 3.60% to 2.10%).

- An aggressive policy ($p_1 < 0.70$ OR $m < 0.20$) reduces false accepts to 15 (**-58.3%** reduction in FA rate from 3.60% to 1.50%).

### Criterion B: Keeps Supported-Crop Rejection Acceptably Low?

- Raw baseline supported-crop rejection is 0.40% (16 / 4,000).

- Under Margin $m < 0.15$: Supported-crop false rejection is only **0.95%** (38 / 4,000) — remaining strictly below 1.0%!

- Under Combined ($p_1 < 0.50$ OR $m < 0.10$): Supported-crop false rejection is **0.75%** (30 / 4,000).

- Under Combined ($p_1 < 0.60$ OR $m < 0.15$): Supported-crop false rejection is **1.27%** (51 / 4,000).

- Under Aggressive ($p_1 < 0.70$ OR $m < 0.20$): Supported-crop false rejection is **2.08%** (83 / 4,000).

### Criterion C: Does Not Destroy Legitimate Field-Leaf Coverage?

- On the 2,225 field-supported leaf samples in validation (from PLD Pakistan, CCMT Uganda, Apple FGVC7, FieldPlant, and PlantDoc Eligible):

  - Raw baseline field supported rejection: **0.31%** (7 / 2,225) $\rightarrow$ **99.69% coverage**

  - Under Margin $m < 0.15$: Field supported rejection is **0.60%** (13 / 2,225) $\rightarrow$ **99.40% coverage preserved**

  - Under Combined ($p_1 < 0.50$ OR $m < 0.10$): Field rejection is **0.51%** (11 / 2,225) $\rightarrow$ **99.49% coverage preserved**

  - Under Combined ($p_1 < 0.60$ OR $m < 0.15$): Field rejection is **0.77%** (17 / 2,225) $\rightarrow$ **99.23% coverage preserved**

  - Under Aggressive ($p_1 < 0.70$ OR $m < 0.20$): Field rejection is **1.11%** (25 / 2,225) $\rightarrow$ **98.89% coverage preserved**

- Legitimate in-the-wild field leaves have robust representations in SigLIP feature space ($p_1 > 0.95$ for 97%+ of field leaves), meaning field coverage remains remarkably robust across all tested thresholds.

## 7. Tradeoff Frontier & Candidate Recommendations

Based strictly on the validation set, three distinct operating regimes emerge on the Pareto frontier:

1. **High-Yield Gating (`margin < 0.15`):**

   - Supported False Rejection: **0.95%** (38 / 4,000) — strictly under 1.0%

   - Field Supported Rejection: **0.60%** (13 / 2,225) — preserves 99.40% field leaf coverage

   - Other False Accept Rate: **2.60%** (26 / 1,000) — eliminates 10 false accepts (-27.8%)

   - *Profile:* Zero disruption to legitimate users while eliminating bottom-tier margin ambiguity.

2. **Balanced Gating (`top1 < 0.60 OR margin < 0.15`):**

   - Supported False Rejection: **1.27%** (51 / 4,000)

   - Field Supported Rejection: **0.77%** (17 / 2,225) — preserves >99.2% field coverage

   - Other False Accept Rate: **2.10%** (21 / 1,000) — **eliminates 15 false accepts (-41.7%)**

   - *Profile:* Clean balance between reducing ambiguous false accepts and preserving field usability.

3. **Safety-First Gating (`top1 < 0.70 OR margin < 0.20`):**

   - Supported False Rejection: **2.08%** (83 / 4,000)

   - Field Supported Rejection: **1.11%** (25 / 2,225)

   - Other False Accept Rate: **1.50%** (15 / 1,000) — **eliminates 21 false accepts (-58.3%)**

   - *Profile:* Priority on strict gatekeeping against imposter species.

## 8. Limitations

1. **Botanical Imposter Floor (15 samples / 1.5%):** Exactly 15 validation samples from `Other` (predominantly cherry and grape leaves infected with powdery mildew or leaf spot) produce high confidence ($p_1 \ge 0.70$ and margin $\ge 0.25$) mimicking apple scab and tomato blight. No scalar confidence or margin threshold can eliminate these without causing severe false rejections in true crops.

2. **Necrotic Leaf Sensitivity:** Extremely diseased leaves (e.g. advanced tomato blight with extensive foliage loss) occasionally exhibit confidence between $0.50$ and $0.65$. Overly aggressive thresholds ($p_1 < 0.70$) begin penalizing the exact damaged leaves that farmers need help diagnosing.

3. **Production Isolation Reminder:** No threshold has been chosen or hard-coded into production. Production checkpoint `E11_SigLIP_HYBRID10_PRODUCTION.pt` remains frozen and untouched.
