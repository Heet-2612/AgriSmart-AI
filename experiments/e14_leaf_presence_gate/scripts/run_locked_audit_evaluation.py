"""
E14: Locked 58-Image Audit Evaluation Script.

Compares:
A) E12 alone (Raw Baseline)
B) Leaf Gate + E12 Raw
C) Leaf Gate + E12 Pre-Registered Confidence/Margin Policy

Evaluation Protocol: Strictly Read-Only (Zero retraining, zero tuning, evaluated exactly once).
"""

import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any

import cv2
import numpy as np
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms
import timm

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

# Local gate import
from experiments.e14_leaf_presence_gate.leaf_presence_gate import LeafPresenceGate
EXP_ROOT = REPO_ROOT / "experiments/e14_leaf_presence_gate"
AUDIT_MANIFEST = REPO_ROOT / "experiments/e00_validity_audit/test_manifest.csv"
YOLO_RESULTS_CSV = REPO_ROOT / "experiments/e00_validity_audit/yolo_results.csv"
E12_CKPT_PATH = REPO_ROOT / "experiments/e12_siglip_validity/validity_classifier_baseline.pt"
PROD_CKPT_PATH = REPO_ROOT / "model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt"

EXPECTED_PROD_SHA = "a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df"
EXPECTED_E12_SHA = "bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322"
EXPECTED_AUDIT_SHA = "4e7b08dd4e68054057bc138a138f034af26c19f700aa95696905277bbfd3442a"


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    print("=" * 70)
    print("E14: LEAF PRESENCE GATE EVALUATION ON 58-IMAGE LOCKED AUDIT")
    print("=" * 70)

    # 1. Safety Verification
    actual_prod_sha = compute_sha256(PROD_CKPT_PATH)
    assert actual_prod_sha == EXPECTED_PROD_SHA, "Production E11 SHA mismatch!"
    print(f"Production E11 Checkpoint SHA256: {actual_prod_sha} [VERIFIED UNTOUCHED]")

    actual_e12_sha = compute_sha256(E12_CKPT_PATH)
    assert actual_e12_sha == EXPECTED_E12_SHA, "E12 Checkpoint SHA mismatch!"
    print(f"E12 Checkpoint SHA256:           {actual_e12_sha} [VERIFIED UNTOUCHED]")

    actual_audit_sha = compute_sha256(AUDIT_MANIFEST)
    assert actual_audit_sha == EXPECTED_AUDIT_SHA, "Audit Manifest SHA mismatch!"
    print(f"Locked Audit Manifest SHA256:    {actual_audit_sha} [VERIFIED UNTOUCHED]")

    # 2. Setup Leaf Presence Gate
    gate = LeafPresenceGate()

    # 3. Setup E12 Model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Inference Device:                {device}")

    backbone = timm.create_model("vit_base_patch16_siglip_224", pretrained=True, num_classes=0).to(device).eval()
    for p in backbone.parameters():
        p.requires_grad = False

    ckpt = torch.load(E12_CKPT_PATH, map_location=device)
    class_names = ckpt["class_names"]

    head = nn.Linear(768, len(class_names)).to(device)
    clean_sd = {k.replace("fc.", ""): v for k, v in ckpt["model_state_dict"].items()}
    head.load_state_dict(clean_sd)
    head.eval()

    transform = transforms.Compose([
        transforms.Resize((224, 224), interpolation=transforms.InterpolationMode.BICUBIC),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ])

    # 4. Load Manifest and Auxiliary YOLO results
    df = pd.read_csv(AUDIT_MANIFEST)
    assert len(df) == 58, f"Expected 58 audit images, found {len(df)}"

    yolo_df = pd.read_csv(YOLO_RESULTS_CSV) if YOLO_RESULTS_CSV.exists() else None

    # 5. Run Single-Shot Inference across all 58 images
    records = []
    for idx, row in df.iterrows():
        p = Path(row["path"])
        cat = row["ground_truth_group"]
        desc = row["description"]
        src = row["source_category"]

        # Ground truth mapping
        if cat == "VALID_SUPPORTED_LEAF":
            if "Potato" in src:
                gt_crop = "Potato"
            elif "Corn" in src:
                gt_crop = "Corn"
            elif "Tomato" in src:
                gt_crop = "Tomato"
            elif "Apple" in src:
                gt_crop = "Apple"
            else:
                raise ValueError(f"Unknown crop in {src}")
        else:
            gt_crop = "Other"

        img = Image.open(p).convert("RGB")
        arr = np.array(img)

        # Step 1: Leaf Presence Gate
        gate_passed, gate_reason, telemetry = gate.evaluate(arr)

        # Step 2: E12 Neural Inference
        x = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            feat = backbone(x)
            logits = head(feat)
            probs = torch.softmax(logits, dim=-1)[0]

        top_probs, top_indices = torch.topk(probs, k=2)
        top1_cls = class_names[top_indices[0].item()]
        top1_prob = top_probs[0].item()
        top2_cls = class_names[top_indices[1].item()]
        top2_prob = top_probs[1].item()
        margin = top1_prob - top2_prob

        # E12 pre-registered threshold trigger (p1 < 0.60 OR margin < 0.15)
        e12_thresh_triggered = (top1_prob < 0.60) or (margin < 0.15)
        e12_thresh_pred = "Other" if e12_thresh_triggered else top1_cls

        # System A: E12 Alone (Raw)
        pred_A = top1_cls
        correct_A = (pred_A == gt_crop)

        # System B: Leaf Gate + E12 Raw
        pred_B = "Other" if not gate_passed else top1_cls
        correct_B = (pred_B == gt_crop)

        # System C: Leaf Gate + E12 Threshold Policy
        pred_C = "Other" if (not gate_passed or e12_thresh_triggered) else top1_cls
        correct_C = (pred_C == gt_crop)

        # Auxiliary YOLO metrics
        y_match = yolo_df[yolo_df["path"] == str(p)] if yolo_df is not None else []
        yolo_conf = y_match["yolo_max_conf"].values[0] if len(y_match) > 0 else None
        yolo_acc35 = bool(y_match["yolo_accepted_conf035"].values[0]) if len(y_match) > 0 else None

        records.append({
            "index": idx + 1,
            "filename": p.name,
            "path": str(p),
            "category": cat,
            "source_category": src,
            "description": desc,
            "gt_crop": gt_crop,
            # Gate outputs
            "gate_passed": gate_passed,
            "gate_reason": gate_reason,
            "green_fraction": telemetry.get("green_fraction", 0.0),
            "largest_component_fraction": telemetry.get("largest_component_fraction", 0.0),
            "component_extent": telemetry.get("component_extent", 0.0),
            "component_solidity": telemetry.get("component_solidity", 0.0),
            # E12 outputs
            "e12_raw_pred": top1_cls,
            "e12_top1_prob": round(top1_prob, 4),
            "e12_top2_cls": top2_cls,
            "e12_top2_prob": round(top2_prob, 4),
            "e12_margin": round(margin, 4),
            "e12_thresh_triggered": e12_thresh_triggered,
            "e12_thresh_pred": e12_thresh_pred,
            # System predictions and correctness
            "pred_A": pred_A,
            "correct_A": correct_A,
            "pred_B": pred_B,
            "correct_B": correct_B,
            "pred_C": pred_C,
            "correct_C": correct_C,
            # YOLO auxiliary
            "yolo_max_conf": yolo_conf,
            "yolo_accepted_035": yolo_acc35,
        })

    res_df = pd.DataFrame(records)

    # 6. Print Summary
    print("\n" + "=" * 70)
    print("LOCKED AUDIT SUMMARY: COMPARISON OF ARCHITECTURES")
    print("=" * 70)

    total_n = len(res_df)
    acc_A = res_df["correct_A"].mean() * 100.0
    acc_B = res_df["correct_B"].mean() * 100.0
    acc_C = res_df["correct_C"].mean() * 100.0

    print(f"Total Audit Images: {total_n}")
    print(f"  System A (E12 Alone Raw):                   {res_df['correct_A'].sum()}/{total_n} ({acc_A:.2f}%)")
    print(f"  System B (Leaf Gate + E12 Raw):             {res_df['correct_B'].sum()}/{total_n} ({acc_B:.2f}%)")
    print(f"  System C (Leaf Gate + E12 Threshold):       {res_df['correct_C'].sum()}/{total_n} ({acc_C:.2f}%)")

    # Category breakdown
    print("\n" + "=" * 70)
    print("PER-CATEGORY COMPARISON")
    print("=" * 70)

    categories = ["VALID_SUPPORTED_LEAF", "VALID_UNSUPPORTED_LEAF", "NOT_LEAF", "DEGENERATE"]
    for cat in categories:
        sub = res_df[res_df["category"] == cat]
        n_c = len(sub)
        print(f"\n--- {cat} (N={n_c}) ---")
        cA = sub["correct_A"].sum()
        cB = sub["correct_B"].sum()
        cC = sub["correct_C"].sum()
        print(f"  Accuracy: System A = {cA}/{n_c} ({cA/n_c*100:.1f}%) | System B = {cB}/{n_c} ({cB/n_c*100:.1f}%) | System C = {cC}/{n_c} ({cC/n_c*100:.1f}%)")

        if cat == "VALID_SUPPORTED_LEAF":
            # Acceptance rate as correct crop
            print(f"  Supported False Rejection (classified as Other):")
            fr_A = (sub["pred_A"] == "Other").sum()
            fr_B = (sub["pred_B"] == "Other").sum()
            fr_C = (sub["pred_C"] == "Other").sum()
            print(f"    System A: {fr_A}/{n_c} ({fr_A/n_c*100:.2f}%)")
            print(f"    System B: {fr_B}/{n_c} ({fr_B/n_c*100:.2f}%)")
            print(f"    System C: {fr_C}/{n_c} ({fr_C/n_c*100:.2f}%)")
        else:
            # Rejection rate as Other
            print(f"  Rejection Rate (classified as Other):")
            rej_A = (sub["pred_A"] == "Other").sum()
            rej_B = (sub["pred_B"] == "Other").sum()
            rej_C = (sub["pred_C"] == "Other").sum()
            print(f"    System A: {rej_A}/{n_c} ({rej_A/n_c*100:.2f}%) [False Accept: {n_c-rej_A}]")
            print(f"    System B: {rej_B}/{n_c} ({rej_B/n_c*100:.2f}%) [False Accept: {n_c-rej_B}]")
            print(f"    System C: {rej_C}/{n_c} ({rej_C/n_c*100:.2f}%) [False Accept: {n_c-rej_C}]")

    # 7. Analyze the 8 Dangerous NOT_LEAF cases
    print("\n" + "=" * 70)
    print("DETAILED STATUS OF THE 8 DANGEROUS NOT_LEAF SAMPLES")
    print("=" * 70)
    not_leaf_df = res_df[res_df["category"] == "NOT_LEAF"]
    # The 8 samples that failed under raw E11 / E12
    dangerous_idx = [35, 43, 45, 46, 47, 50, 51, 52]
    d_df = not_leaf_df[not_leaf_df["index"].isin(dangerous_idx)]

    for _, r in d_df.iterrows():
        g_st = "ACCEPTED" if r["gate_passed"] else f"REJECTED ({r['gate_reason']})"
        print(f"[{r['index']:02d}] {r['filename']:<30} | GT: Other")
        print(f"     Gate: {g_st}")
        print(f"     Sys A: {r['pred_A']:<7} ({'CORRECT' if r['correct_A'] else 'FALSE ACCEPT'})")
        print(f"     Sys B: {r['pred_B']:<7} ({'CORRECT' if r['correct_B'] else 'FALSE ACCEPT'})")
        print(f"     Sys C: {r['pred_C']:<7} ({'CORRECT' if r['correct_C'] else 'FALSE ACCEPT'})")

    # Save CSV
    csv_out = EXP_ROOT / "e14_locked_audit_results.csv"
    res_df.to_csv(csv_out, index=False)
    print(f"\nSaved detailed audit results to: {csv_out}")


if __name__ == "__main__":
    main()
