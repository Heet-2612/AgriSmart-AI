# Experiment 0: Far-OOD & Input-Validity Signal Audit

## Executive Summary
This directory contains the audit artifacts, evaluation code, fixed evaluation dataset, and experimental findings for **Experiment 0: Zero-Shot SigLIP + Existing YOLO Audit** conducted during the 12-hour ML experimentation window for **AgriSmart AI**.

### Core Findings & Verdict
* **Final Verdict:** `D. TRAIN — neither is sufficient; proceed to frozen-SigLIP 5-way classifier`
* **Operational Readiness:** `PROMISING BUT NEEDS TRAINING`
* **Production Integrity Check:** `E11_SigLIP_HYBRID10_PRODUCTION.pt` SHA256 verified identical to reference `a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df` (bit-for-bit unchanged).
* **SigLIP Implementation Audit:** The current locked environment uses `timm` (`vit_base_patch16_siglip_224`, pretrained `timm/v2_webli`). It is strictly a **VisionTransformer** image backbone (`num_classes=0`). The matching SigLIP text transformer, tokenizer, and text projection head are **NOT present** in the installed codebase or environment (`transformers` and `open_clip` are not installed). Under Experiment 0 non-negotiable rules (no package alterations, no downloading large new models), zero-shot image-text similarity is **technically unavailable**.
* **Existing YOLO Detector Audit:** A fully-trained leaf detector model (`runs/detect/e5_leaf_yolov8n/weights/best.pt`, 6.23 MB) was discovered in `AgriSmart-AI-main`. It was trained on `SoyCotton-Leafs` (Univ. of Sao Paulo, CC BY 4.0, single class 0: `leaf`). Inference runs at ~12.8 ms on GPU.
* **Exact Failure Case (Website Screenshot -> Apple Cedar Rust):** When tested on real website banners and screenshots, the existing YOLO detector returns **0 detections** (100% rejection on pure screenshots, and 80% across general UI assets). However, raw SoyCotton YOLO suffers a **50.0% false rejection rate on PlantVillage lab leaves** due to domain shift from canopy images to isolated flat leaves.

---

## Directory Contents
```
experiments/e00_validity_audit/
├── README.md                      # This overview and file inventory
├── E00_VALIDITY_AUDIT_REPORT.md   # Complete, authoritative engineering report
├── test_manifest.csv              # Curated 58-sample evaluation manifest
├── zero_shot_results.csv          # Audit record of SigLIP zero-shot status
├── yolo_results.csv               # Per-image YOLO and quality gate results
├── combined_results.csv           # Combined signal evaluation status
└── summary.json                   # Machine-readable evaluation summary & metrics
```
