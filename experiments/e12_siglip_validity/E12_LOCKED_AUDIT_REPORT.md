# E12 SigLIP Validity Probe - 58-Image Locked Audit Evaluation Report

**Date:** 2026-09-14
**Evaluation Mode:** Strictly Read-Only (Zero tuning, zero modification, zero retraining)
**E12 Classifier Checkpoint:** [`validity_classifier_baseline.pt`](file:///C:/VScode/AgriSmart-AI-integration/experiments/e12_siglip_validity/validity_classifier_baseline.pt)
**Checkpoint SHA256:** `bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322`
**E11 Production Checkpoint SHA256:** `a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df` (Verified Bitwise Identical)

## 1. Executive Summary & Aggregate Key Metrics

| Metric | Result | Count / Total | Notes |
| :--- | :---: | :---: | :--- |
| **Overall Audit Accuracy** | **79.31%** | 46 / 58 | Across all 58 locked audit images |
| **Supported Leaf Accuracy** | **88.89%** | 16 / 18 | Correct crop prediction on Potato/Corn/Tomato/Apple |
| **Supported Leaf False Rejection Rate** | **5.56%** | 1 / 18 | Legitimate supported leaves mispredicted as `Other` |
| **Unsupported Leaf Rejection Rate** | **85.71%** | 12 / 14 | Non-target crop leaves successfully rejected as `Other` |
| **Non-Leaf False-Accept Rate** | **40.00%** | 8 / 20 | Non-leaves (UI, objects, landscapes) accepted as crops |
| **Degenerate False-Accept Rate** | **0.00%** | 0 / 6 | Noise/solids accepted as crops |

## 2. Category-Specific Breakdown

### 2.1 VALID_SUPPORTED_LEAF ($N=18$)

- **Overall Group Accuracy:** 88.89% (16/18)

- **False Rejections (classified as `Other`):** 1 (5.56%)

- **Cross-Crop Misclassifications:** 1


#### Crop-Specific Accuracy Breakdown:

| Crop | Support | Correct | Accuracy | Rejections (`Other`) | Cross-Crop Errors |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Potato** | 5 | 3 | **60.00%** | 1 | 1 |
| **Corn** | 5 | 5 | **100.00%** | 0 | 0 |
| **Tomato** | 4 | 4 | **100.00%** | 0 | 0 |
| **Apple** | 4 | 4 | **100.00%** | 0 | 0 |


### 2.2 VALID_UNSUPPORTED_LEAF ($N=14$)

- **Rejection Rate (Predicted as `Other`):** **85.71%** (12/14)

- **False Accept Rate (Predicted as supported crop):** **14.29%** (2/14)


False Accept Breakdown by Predicted Crop:
- Misclassified as **Apple**: 2


### 2.3 NOT_LEAF ($N=20$)

- **Correctly Rejected as `Other`:** 12 / 20 (60.00%)

- **False-Accept Rate (Predicted as supported crop):** **40.00%** (8/20)


False Accept Breakdown by Predicted Crop:
- Misclassified as **Potato**: 1
- Misclassified as **Corn**: 3
- Misclassified as **Tomato**: 4


### 2.4 DEGENERATE ($N=6$)

- **Correctly Rejected as `Other`:** 6 / 6 (100.00%)

- **False-Accept Rate (Predicted as supported crop):** **0.00%** (0/6)


## 3. Complete 5x5 Confusion Matrix

| Ground Truth \ Predicted | **Potato** | **Corn** | **Tomato** | **Apple** | **Other** | **Total** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Potato** | 3 | 0 | 1 | 0 | 1 | 5 |
| **Corn** | 0 | 5 | 0 | 0 | 0 | 5 |
| **Tomato** | 0 | 0 | 4 | 0 | 0 | 4 |
| **Apple** | 0 | 0 | 0 | 4 | 0 | 4 |
| **Other** | 1 | 3 | 4 | 2 | 30 | 40 |


## 4. Complete Audit Ledger (All 58 Locked Audit Images)

| # | File Basename | Audit Category | Description | GT Target | Predicted Class | Top-1 Conf | Top-2 Class | Top-2 Conf | Margin | Result |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 01 | `001187a0-57ab-4329-baf` | VALID_SUPPORTED_LEAF | PlantVillage Potato Early Blight | Potato | **Potato** | 0.9762 | Tomato | 0.0196 | 0.9565 | CORRECT |
| 02 | `07dfb451-4378-49d1-b69` | VALID_SUPPORTED_LEAF | PlantVillage Potato Healthy | Potato | **Other** | 0.7471 | Potato | 0.2369 | 0.5102 | **ERROR** |
| 03 | `045080ca-8b98-4320-adc` | VALID_SUPPORTED_LEAF | PlantVillage Corn Gray Leaf Spot | Corn | **Corn** | 0.9973 | Other | 0.0026 | 0.9947 | CORRECT |
| 04 | `03fc887f-e206-4233-882` | VALID_SUPPORTED_LEAF | PlantVillage Corn Healthy | Corn | **Corn** | 0.9971 | Other | 0.0026 | 0.9945 | CORRECT |
| 05 | `009dd1f5-281a-4e54-9f8` | VALID_SUPPORTED_LEAF | PlantVillage Tomato YLCV | Tomato | **Tomato** | 0.9907 | Other | 0.0065 | 0.9842 | CORRECT |
| 06 | `01c1da17-8d9f-4d69-8a1` | VALID_SUPPORTED_LEAF | PlantVillage Tomato Healthy | Tomato | **Tomato** | 0.9989 | Other | 0.0011 | 0.9978 | CORRECT |
| 07 | `01a66316-0e98-4d3b-a56` | VALID_SUPPORTED_LEAF | PlantVillage Apple Scab | Apple | **Apple** | 0.9950 | Other | 0.0036 | 0.9913 | CORRECT |
| 08 | `04da297e-5238-41b1-a8a` | VALID_SUPPORTED_LEAF | PlantVillage Apple Cedar Rust | Apple | **Apple** | 0.9956 | Other | 0.0034 | 0.9922 | CORRECT |
| 09 | `Early_Blight_10.jpg` | VALID_SUPPORTED_LEAF | Field Potato Early Blight (PLD Pakistan) | Potato | **Potato** | 0.9826 | Other | 0.0163 | 0.9663 | CORRECT |
| 10 | `Healthy_10.jpg` | VALID_SUPPORTED_LEAF | Field Potato Healthy (PLD Pakistan) | Potato | **Potato** | 0.9962 | Other | 0.0023 | 0.9940 | CORRECT |
| 11 | `leaf spot1002_.jpg` | VALID_SUPPORTED_LEAF | Field Corn Gray Leaf Spot (CCMT Uganda) | Corn | **Corn** | 0.9995 | Other | 0.0003 | 0.9991 | CORRECT |
| 12 | `Train_1049.jpg` | VALID_SUPPORTED_LEAF | Field Apple Scab (FGVC7 Orchard) | Apple | **Apple** | 0.9988 | Tomato | 0.0006 | 0.9982 | CORRECT |
| 13 | `Mais_Cercosporiose_-2-` | VALID_SUPPORTED_LEAF | Field Corn GLS (FieldPlant) | Corn | **Corn** | 0.9987 | Other | 0.0012 | 0.9975 | CORRECT |
| 14 | `h106.jpg` | VALID_SUPPORTED_LEAF | Field Tomato Healthy (Taiwan) | Tomato | **Tomato** | 0.9991 | Potato | 0.0005 | 0.9986 | CORRECT |
| 15 | `test_3023.jpg` | VALID_SUPPORTED_LEAF | PlantDoc Potato Early Blight in field | Potato | **Tomato** | 0.6149 | Potato | 0.2337 | 0.3812 | **ERROR** |
| 16 | `test_IMG_42231.jpg` | VALID_SUPPORTED_LEAF | PlantDoc Corn GLS in field | Corn | **Corn** | 0.9991 | Other | 0.0006 | 0.9985 | CORRECT |
| 17 | `test_1684.jpg` | VALID_SUPPORTED_LEAF | PlantDoc Tomato Healthy in field | Tomato | **Tomato** | 0.9976 | Other | 0.0023 | 0.9953 | CORRECT |
| 18 | `test_052609%20Hartman%` | VALID_SUPPORTED_LEAF | PlantDoc Apple Scab in field | Apple | **Apple** | 0.9879 | Other | 0.0106 | 0.9773 | CORRECT |
| 19 | `00247bff-26dc-445a-8d1` | VALID_UNSUPPORTED_LEAF | PlantVillage Soybean Healthy leaf | Other | **Other** | 0.8169 | Tomato | 0.1533 | 0.6636 | CORRECT |
| 20 | `test_07feb_ma_sbr3.JPG` | VALID_UNSUPPORTED_LEAF | PlantDoc Soybean Healthy leaf | Other | **Apple** | 0.5942 | Other | 0.3385 | 0.2557 | **ERROR** |
| 21 | `002f87b7-e1a5-49e5-a42` | VALID_UNSUPPORTED_LEAF | PlantVillage Bell Pepper Healthy leaf | Other | **Other** | 0.9961 | Apple | 0.0019 | 0.9941 | CORRECT |
| 22 | `03bb7042-3fd5-42e1-aa2` | VALID_UNSUPPORTED_LEAF | PlantVillage Bell Pepper Bacterial Spot leaf | Other | **Other** | 0.9721 | Potato | 0.0236 | 0.9485 | CORRECT |
| 23 | `01e591c9-e3e7-4edc-821` | VALID_UNSUPPORTED_LEAF | PlantVillage Strawberry Healthy leaf | Other | **Other** | 0.6941 | Apple | 0.2982 | 0.3958 | CORRECT |
| 24 | `test_strawberry-leaf--` | VALID_UNSUPPORTED_LEAF | PlantDoc Strawberry Healthy leaf | Other | **Other** | 0.9654 | Tomato | 0.0341 | 0.9313 | CORRECT |
| 25 | `03027791-26bb-4c46-960` | VALID_UNSUPPORTED_LEAF | PlantVillage Grape Healthy leaf | Other | **Other** | 0.9990 | Tomato | 0.0009 | 0.9981 | CORRECT |
| 26 | `03423777-68b9-430e-978` | VALID_UNSUPPORTED_LEAF | PlantVillage Grape Black Rot leaf | Other | **Other** | 0.9987 | Apple | 0.0008 | 0.9979 | CORRECT |
| 27 | `017d3d86-12bf-4280-892` | VALID_UNSUPPORTED_LEAF | PlantVillage Peach Healthy leaf | Other | **Other** | 0.9816 | Apple | 0.0174 | 0.9641 | CORRECT |
| 28 | `test_00pe.jpg` | VALID_UNSUPPORTED_LEAF | PlantDoc Peach Healthy leaf | Other | **Apple** | 0.6158 | Other | 0.3829 | 0.2330 | **ERROR** |
| 29 | `00fee259-67b7-4dd7-8b3` | VALID_UNSUPPORTED_LEAF | PlantVillage Blueberry Healthy leaf | Other | **Other** | 0.9646 | Potato | 0.0248 | 0.9398 | CORRECT |
| 30 | `test_blueberry-leaves-` | VALID_UNSUPPORTED_LEAF | PlantDoc Blueberry Healthy leaf | Other | **Other** | 0.9988 | Potato | 0.0004 | 0.9984 | CORRECT |
| 31 | `020e14fb-6016-4d7f-b48` | VALID_UNSUPPORTED_LEAF | PlantVillage Raspberry Healthy leaf | Other | **Other** | 0.9852 | Apple | 0.0131 | 0.9721 | CORRECT |
| 32 | `test_depositphotos_132` | VALID_UNSUPPORTED_LEAF | PlantDoc Raspberry Healthy leaf | Other | **Other** | 0.9765 | Tomato | 0.0123 | 0.9642 | CORRECT |
| 33 | `waitlist-banner-es.png` | NOT_LEAF | Website Banner Spanish (yields Apple Cedar Rust on E11) | Other | **Other** | 0.2945 | Potato | 0.2334 | 0.0610 | CORRECT |
| 34 | `waitlist-banner-ko.png` | NOT_LEAF | Website Banner Korean (yields Apple Cedar Rust on E11) | Other | **Other** | 0.5869 | Corn | 0.2963 | 0.2906 | CORRECT |
| 35 | `social-preview.png` | NOT_LEAF | Social Preview Website Banner (yields Apple Healthy on E11) | Other | **Corn** | 0.4167 | Apple | 0.2908 | 0.1259 | **ERROR** |
| 36 | `veya-logo.png` | NOT_LEAF | Web Application Logo (yields Apple Cedar Rust on E11) | Other | **Other** | 0.9131 | Corn | 0.0484 | 0.8647 | CORRECT |
| 37 | `logo-dark.png` | NOT_LEAF | Dark Theme Web Logo (yields Tomato Healthy on E11) | Other | **Other** | 0.6144 | Potato | 0.2636 | 0.3508 | CORRECT |
| 38 | `document_invoice_0.png` | NOT_LEAF | Rendered Document Invoice 0 | Other | **Other** | 0.9868 | Corn | 0.0107 | 0.9761 | CORRECT |
| 39 | `document_invoice_1.png` | NOT_LEAF | Rendered Document Invoice 1 | Other | **Other** | 0.9764 | Corn | 0.0175 | 0.9589 | CORRECT |
| 40 | `document_invoice_2.png` | NOT_LEAF | Rendered Document Invoice 2 | Other | **Other** | 0.9771 | Corn | 0.0162 | 0.9609 | CORRECT |
| 41 | `document_invoice_3.png` | NOT_LEAF | Rendered Document Invoice 3 | Other | **Other** | 0.9796 | Corn | 0.0152 | 0.9644 | CORRECT |
| 42 | `trading_er_diagram.png` | NOT_LEAF | Trading System Database Schema Diagram | Other | **Other** | 0.9979 | Corn | 0.0009 | 0.9969 | CORRECT |
| 43 | `Minduka_Present_Blue_P` | NOT_LEAF | Minduka Present Blue Pack gift box object | Other | **Potato** | 0.4372 | Other | 0.4313 | 0.0059 | **ERROR** |
| 44 | `formula 1.jpg` | NOT_LEAF | Formula 1 Racing Vehicle photograph | Other | **Other** | 0.5902 | Corn | 0.2547 | 0.3355 | CORRECT |
| 45 | `Red Bull Racing.jpg` | NOT_LEAF | Red Bull Racing Formula 1 Car photograph | Other | **Tomato** | 0.6004 | Other | 0.2262 | 0.3742 | **ERROR** |
| 46 | `grace_hopper.jpg` | NOT_LEAF | Grace Hopper portrait photograph | Other | **Tomato** | 0.4280 | Other | 0.3442 | 0.0838 | **ERROR** |
| 47 | `Star boy.jpg` | NOT_LEAF | Human portrait photograph | Other | **Tomato** | 0.3508 | Other | 0.3235 | 0.0272 | **ERROR** |
| 48 | `retriever-icon.png` | NOT_LEAF | Golden retriever animal illustration | Other | **Other** | 0.6578 | Corn | 0.1253 | 0.5326 | CORRECT |
| 49 | `china.jpg` | NOT_LEAF | China Temple Architecture photograph | Other | **Other** | 0.9281 | Corn | 0.0489 | 0.8792 | CORRECT |
| 50 | `img20.jpg` | NOT_LEAF | Natural desert landscape wallpaper | Other | **Corn** | 0.5863 | Other | 0.3930 | 0.1932 | **ERROR** |
| 51 | `img24.jpg` | NOT_LEAF | Natural landscape wallpaper | Other | **Corn** | 0.4800 | Other | 0.4734 | 0.0066 | **ERROR** |
| 52 | `train_tomato-blight-so` | NOT_LEAF | Field soil bed with treatment | Other | **Tomato** | 0.9916 | Other | 0.0078 | 0.9838 | **ERROR** |
| 53 | `pure_white.png` | DEGENERATE | Pure White [255, 255, 255] | Other | **Other** | 0.8788 | Tomato | 0.0644 | 0.8144 | CORRECT |
| 54 | `pure_black.png` | DEGENERATE | Pure Black [0, 0, 0] | Other | **Other** | 0.7173 | Corn | 0.1839 | 0.5334 | CORRECT |
| 55 | `solid_green.png` | DEGENERATE | Solid Green [0, 128, 0] | Other | **Other** | 0.9301 | Tomato | 0.0348 | 0.8954 | CORRECT |
| 56 | `solid_brown.png` | DEGENERATE | Solid Brown [139, 69, 19] | Other | **Other** | 0.9634 | Tomato | 0.0150 | 0.9484 | CORRECT |
| 57 | `gaussian_noise_0.png` | DEGENERATE | Gaussian Noise mean=128, std=40 | Other | **Other** | 0.9931 | Corn | 0.0057 | 0.9874 | CORRECT |
| 58 | `uniform_noise_0.png` | DEGENERATE | Uniform Random Noise [0, 255] | Other | **Other** | 0.9866 | Corn | 0.0121 | 0.9745 | CORRECT |


## 5. Integrity & Reproducibility Audit

- **Audit Set Contamination Check:** 0 images ever used in training, validation, or tuning.

- **Backbone:** Frozen `google/siglip-base-patch16-224` visual encoder (768-d).

- **E12 Checkpoint SHA256:** `bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322`

- **Production E11 Checkpoint SHA256:** `a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df` (Confirmed Untouched)

- **Zero Production Integration:** No threshold applied, no production gating modified.
