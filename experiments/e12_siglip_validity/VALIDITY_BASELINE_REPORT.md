# E12 SigLIP Validity Probe — Baseline Training & Evaluation Report

**Date:** 2026-09-14
**Status:** Clean Baseline Established (**Production Untouched**)
**Architecture:** Frozen SigLIP ViT-B/16 (768-d) + Linear Head (`nn.Linear(768, 5)`)
**Training Epochs:** 15 | **Optimizer:** AdamW (lr=1e-3, weight_decay=1e-4, cosine annealing)
**Training Set:** $N=19,800$ | **Validation Set:** $N=5,000$

## 1. Executive Summary

- **Validation Accuracy:** **98.62%** (4931 / 5,000 correct)
- **Validation Macro-F1:** **98.62%**
- **Validation Weighted-F1:** **98.62%**
- **Feature Cache:** [`validity_feature_cache.pt`](file:///C:\VScode\AgriSmart-AI-integration\experiments\e12_siglip_validity\validity_feature_cache.pt) (`torch.Size([19800, 768])`, `torch.Size([5000, 768])`)
  - **SHA256:** `e05b3ec56dfbc22cc318a3e96cbcd37c2c75af7ec5ffb4d7a174883c984c00b9`
- **Model Checkpoint:** [`validity_classifier_baseline.pt`](file:///C:\VScode\AgriSmart-AI-integration\experiments\e12_siglip_validity\validity_classifier_baseline.pt)
  - **SHA256:** `bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322`

## 2. Per-Class Performance

| Class Index | Class Name | Precision | Recall | F1-Score | Validation Support |
| :---: | :--- | :---: | :---: | :---: | :---: |
| `0` | **Potato** | 98.51% | 99.40% | **98.95%** | 1,000 |
| `1` | **Corn** | 99.40% | 99.80% | **99.60%** | 1,000 |
| `2` | **Tomato** | 98.69% | 97.90% | **98.29%** | 1,000 |
| `3` | **Apple** | 98.13% | 99.60% | **98.86%** | 1,000 |
| `4` | **Other** | 98.37% | 96.40% | **97.37%** | 1,000 |
| — | **Macro Average** | **98.62%** | **98.62%** | **98.62%** | **5,000** |

## 3. Confusion Matrix

| Ground Truth \ Pred | **Potato** | **Corn** | **Tomato** | **Apple** | **Other** | **Total** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Potato** | 994 | 0 | 3 | 0 | 3 | 1,000 |
| **Corn** | 0 | 998 | 1 | 0 | 1 | 1,000 |
| **Tomato** | 10 | 3 | 979 | 0 | 8 | 1,000 |
| **Apple** | 0 | 0 | 0 | 996 | 4 | 1,000 |
| **Other** | 5 | 3 | 9 | 19 | 964 | 1,000 |

## 4. Performance Breakdown by Domain

| Domain | Total Samples | Correct Samples | Error Count | Accuracy |
| :--- | :---: | :---: | :---: | :---: |
| **degenerate** | 15 | 15 | 0 | **100.00%** |
| **digital_ui** | 25 | 25 | 0 | **100.00%** |
| **field** | 2,800 | 2,778 | 22 | **99.21%** |
| **lab** | 2,110 | 2,063 | 47 | **97.77%** |
| **surroundings** | 50 | 50 | 0 | **100.00%** |

## 5. Performance Breakdown by Source Dataset

| Source Dataset | Total Samples | Correct Samples | Error Count | Accuracy |
| :--- | :---: | :---: | :---: | :---: |
| **Apple_FGVC7** | 500 | 499 | 1 | **99.80%** |
| **CCMT_Uganda** | 850 | 841 | 9 | **98.94%** |
| **FieldPlant** | 375 | 371 | 4 | **98.93%** |
| **NegativeSuite_degenerate** | 15 | 15 | 0 | **100.00%** |
| **NegativeSuite_digital_ui** | 25 | 25 | 0 | **100.00%** |
| **NegativeSuite_surroundings** | 50 | 50 | 0 | **100.00%** |
| **PlantDoc_Eligible** | 150 | 145 | 5 | **96.67%** |
| **PlantVillage** | 2,110 | 2,063 | 47 | **97.77%** |
| **Potato_PLD** | 850 | 849 | 1 | **99.88%** |
| **Taiwan_Tomato** | 75 | 73 | 2 | **97.33%** |

## 6. Confidence and Top1-Top2 Margin Statistics

| Metric | Mean | Median | Std Dev | Min | Max |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **All Validation Samples (Top-1 Conf)** | 0.9682 | 0.9965 | 0.0798 | 0.3324 | 1.0000 |
| **All Validation Samples (Margin)** | 0.9427 | 0.9938 | 0.1447 | 0.0017 | 1.0000 |
| **Correct Predictions (Top-1 Conf)** | 0.9725 | 0.9966 | 0.0691 | 0.3341 | 1.0000 |
| **Incorrect Predictions (Top-1 Conf)** | 0.6622 | 0.6458 | 0.1590 | 0.3324 | 0.9994 |
| **Incorrect Predictions (Margin)** | 0.3757 | 0.3622 | 0.2872 | 0.0056 | 0.9989 |

## 7. Integrity & Reproducibility Audit

- **58-Image Locked Audit Integrity:** Strictly held out (0 samples in train, 0 samples in validation).
- **701-Image E11 PlantDoc Diagnostic Holdout:** Strictly held out from training (0 samples in train).
- **Training / Validation Disjointness:** 0 path collisions, 0 SHA-256 hash collisions.
- **Reproducibility Seed:** `42` (deterministic PyTorch & cuDNN backend).
- **Production Isolation:** `app/`, `frontend/`, `model/`, and E11 production checkpoints remain completely untouched.
