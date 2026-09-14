"""
E12 SigLIP Validity Probe - Pre-Registered Threshold Audit on Locked 58-Image Set.

Policy:
    if top1_probability < 0.60 OR (top1_probability - top2_probability) < 0.15:
        classify as Other / inconclusive
    else:
        retain the E12 predicted crop class

Evaluation Mode: Strictly Read-Only (Zero tuning, zero modification, zero retraining)
"""

import os
import sys
import hashlib
from pathlib import Path
from typing import Dict, List, Any

import numpy as np
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms
import timm

# Path configuration
REPO_ROOT = Path(__file__).resolve().parents[2]
AUDIT_DIR = REPO_ROOT / "experiments/e00_validity_audit"
MANIFEST_PATH = AUDIT_DIR / "test_manifest.csv"
E12_CKPT_PATH = REPO_ROOT / "model/checkpoints/validity_classifier_baseline.pt"
PROD_CKPT_PATH = REPO_ROOT / "model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt"

EXPECTED_E12_SHA = "bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322"
EXPECTED_PROD_SHA = "a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df"


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    print("=" * 70)
    print("E12 PRE-REGISTERED THRESHOLD EVALUATION ON 58-IMAGE LOCKED AUDIT")
    print("=" * 70)

    # 1. Checkpoint integrity checks
    actual_e12_sha = compute_sha256(E12_CKPT_PATH)
    print(f"E12 Checkpoint:      {E12_CKPT_PATH.name}")
    print(f"  SHA256:            {actual_e12_sha}")
    assert actual_e12_sha == EXPECTED_E12_SHA, f"E12 SHA mismatch! Expected {EXPECTED_E12_SHA}, got {actual_e12_sha}"

    actual_prod_sha = compute_sha256(PROD_CKPT_PATH)
    print(f"Production E11:      {PROD_CKPT_PATH.name}")
    print(f"  SHA256:            {actual_prod_sha}")
    assert actual_prod_sha == EXPECTED_PROD_SHA, f"Prod SHA mismatch! Expected {EXPECTED_PROD_SHA}, got {actual_prod_sha}"

    # 2. Setup model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running on device:   {device}")

    backbone = timm.create_model("vit_base_patch16_siglip_224", pretrained=True, num_classes=0).to(device).eval()
    for p in backbone.parameters():
        p.requires_grad = False

    ckpt = torch.load(E12_CKPT_PATH, map_location=device)
    class_names = ckpt["class_names"]  # ['Potato', 'Corn', 'Tomato', 'Apple', 'Other']
    print(f"Loaded E12 classes:  {class_names}")

    head = nn.Linear(768, len(class_names)).to(device)
    clean_sd = {k.replace("fc.", ""): v for k, v in ckpt["model_state_dict"].items()}
    head.load_state_dict(clean_sd)
    head.eval()

    transform = transforms.Compose([
        transforms.Resize((224, 224), interpolation=transforms.InterpolationMode.BICUBIC),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ])

    # 3. Load 58-image locked manifest
    df = pd.read_csv(MANIFEST_PATH)
    assert len(df) == 58, f"Expected 58 audit images, found {len(df)}"
    print(f"Loaded locked manifest: {MANIFEST_PATH} ({len(df)} images)")

    # 4. Run inference
    records = []

    # Ground truth mapping:
    # VALID_SUPPORTED_LEAF has target crop in description/source_category
    # VALID_UNSUPPORTED_LEAF, NOT_LEAF, DEGENERATE should be 'Other'
    for idx, row in df.iterrows():
        p = Path(row["path"])
        cat = row["ground_truth_group"]
        desc = row["description"]
        src = row["source_category"]

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
                raise ValueError(f"Unknown supported crop in {src}")
        else:
            gt_crop = "Other"

        img = Image.open(p).convert("RGB")
        x = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            feat = backbone(x)
            logits = head(feat)
            probs = torch.softmax(logits, dim=-1)[0]

        top_probs, top_indices = torch.topk(probs, k=5)
        top1_cls = class_names[top_indices[0].item()]
        top1_prob = top_probs[0].item()
        top2_cls = class_names[top_indices[1].item()]
        top2_prob = top_probs[1].item()
        margin = top1_prob - top2_prob

        # Raw prediction correctness
        raw_pred = top1_cls
        raw_correct = (raw_pred == gt_crop)

        # Pre-registered threshold policy:
        # if top1_probability < 0.60 OR (top1_probability - top2_probability) < 0.15:
        #     classify as Other / inconclusive
        # else:
        #     retain the E12 predicted crop class
        threshold_triggered = (top1_prob < 0.60) or (margin < 0.15)
        if threshold_triggered:
            thresh_pred = "Other"
        else:
            thresh_pred = raw_pred

        thresh_correct = (thresh_pred == gt_crop)

        records.append({
            "index": idx + 1,
            "filename": p.name,
            "path": str(p),
            "category": cat,
            "source_category": src,
            "description": desc,
            "gt_crop": gt_crop,
            "raw_pred": raw_pred,
            "top1_prob": top1_prob,
            "top2_cls": top2_cls,
            "top2_prob": top2_prob,
            "margin": margin,
            "raw_correct": raw_correct,
            "threshold_triggered": threshold_triggered,
            "thresh_pred": thresh_pred,
            "thresh_correct": thresh_correct,
        })

    res_df = pd.DataFrame(records)

    # 5. Compute Metrics
    print("\n" + "=" * 70)
    print("AUDIT RESULTS SUMMARY")
    print("=" * 70)

    total_n = len(res_df)
    raw_acc = res_df["raw_correct"].mean() * 100
    thresh_acc = res_df["thresh_correct"].mean() * 100

    print(f"Overall Accuracy: Raw = {res_df['raw_correct'].sum()}/{total_n} ({raw_acc:.2f}%) "
          f"-> Thresh = {res_df['thresh_correct'].sum()}/{total_n} ({thresh_acc:.2f}%)")

    # By category
    for cat in ["VALID_SUPPORTED_LEAF", "VALID_UNSUPPORTED_LEAF", "NOT_LEAF", "DEGENERATE"]:
        sub = res_df[res_df["category"] == cat]
        n_sub = len(sub)
        raw_c = sub["raw_correct"].sum()
        thresh_c = sub["thresh_correct"].sum()
        print(f"\nCategory: {cat} (N={n_sub})")
        print(f"  Raw Correct:        {raw_c}/{n_sub} ({raw_c/n_sub*100:.2f}%)")
        print(f"  Threshold Correct:  {thresh_c}/{n_sub} ({thresh_c/n_sub*100:.2f}%)")
        print(f"  Delta:              {thresh_c - raw_c:+d} correct")

        if cat == "VALID_SUPPORTED_LEAF":
            # Breakdown: accepted correctly, false rejection (Other), cross-crop error
            raw_accepted = (sub["raw_pred"] == sub["gt_crop"]).sum()
            raw_false_rej = (sub["raw_pred"] == "Other").sum()
            raw_cross = n_sub - raw_accepted - raw_false_rej

            thresh_accepted = (sub["thresh_pred"] == sub["gt_crop"]).sum()
            thresh_false_rej = (sub["thresh_pred"] == "Other").sum()
            thresh_cross = n_sub - thresh_accepted - thresh_false_rej

            print(f"  [RAW]    Accepted: {raw_accepted}/{n_sub} ({raw_accepted/n_sub*100:.2f}%), "
                  f"False Rej: {raw_false_rej}/{n_sub} ({raw_false_rej/n_sub*100:.2f}%), "
                  f"Cross-crop: {raw_cross}/{n_sub} ({raw_cross/n_sub*100:.2f}%)")
            print(f"  [THRESH] Accepted: {thresh_accepted}/{n_sub} ({thresh_accepted/n_sub*100:.2f}%), "
                  f"False Rej: {thresh_false_rej}/{n_sub} ({thresh_false_rej/n_sub*100:.2f}%), "
                  f"Cross-crop: {thresh_cross}/{n_sub} ({thresh_cross/n_sub*100:.2f}%)")

        else:
            # Rejection rate (predicted as Other) vs False accept (predicted as supported crop)
            raw_rej = (sub["raw_pred"] == "Other").sum()
            raw_fa = n_sub - raw_rej
            thresh_rej = (sub["thresh_pred"] == "Other").sum()
            thresh_fa = n_sub - thresh_rej

            print(f"  [RAW]    Rejection Rate: {raw_rej}/{n_sub} ({raw_rej/n_sub*100:.2f}%), "
                  f"False Accept Rate: {raw_fa}/{n_sub} ({raw_fa/n_sub*100:.2f}%)")
            print(f"  [THRESH] Rejection Rate: {thresh_rej}/{n_sub} ({thresh_rej/n_sub*100:.2f}%), "
                  f"False Accept Rate: {thresh_fa}/{n_sub} ({thresh_fa/n_sub*100:.2f}%)")

    # Specifically analyze the 8 previously observed NOT_LEAF false accepts
    print("\n" + "=" * 70)
    print("ANALYSIS OF THE 8 PREVIOUS NOT_LEAF FALSE ACCEPTS")
    print("=" * 70)
    not_leaf_df = res_df[res_df["category"] == "NOT_LEAF"]
    raw_not_leaf_fa = not_leaf_df[not_leaf_df["raw_pred"] != "Other"]
    print(f"Found {len(raw_not_leaf_fa)} raw NOT_LEAF false accepts (expected 8):")
    for _, r in raw_not_leaf_fa.iterrows():
        status = "REMOVED (Gated to Other)" if r["thresh_pred"] == "Other" else "REMAINS (STILL FALSE ACCEPT)"
        print(f"  - [{r['index']:02d}] {r['filename']:<30} | Raw: {r['raw_pred']} (p1={r['top1_prob']:.4f}, m={r['margin']:.4f}) -> Thresh: {r['thresh_pred']} | {status}")

    # Also check UNSUPPORTED LEAF false accepts
    print("\n" + "=" * 70)
    print("ANALYSIS OF THE 2 PREVIOUS VALID_UNSUPPORTED_LEAF FALSE ACCEPTS")
    print("=" * 70)
    unsupp_df = res_df[res_df["category"] == "VALID_UNSUPPORTED_LEAF"]
    raw_unsupp_fa = unsupp_df[unsupp_df["raw_pred"] != "Other"]
    print(f"Found {len(raw_unsupp_fa)} raw UNSUPPORTED LEAF false accepts (expected 2):")
    for _, r in raw_unsupp_fa.iterrows():
        status = "REMOVED (Gated to Other)" if r["thresh_pred"] == "Other" else "REMAINS (STILL FALSE ACCEPT)"
        print(f"  - [{r['index']:02d}] {r['filename']:<30} | Raw: {r['raw_pred']} (p1={r['top1_prob']:.4f}, m={r['margin']:.4f}) -> Thresh: {r['thresh_pred']} | {status}")

    # Also check SUPPORTED LEAF errors
    print("\n" + "=" * 70)
    print("ANALYSIS OF VALID_SUPPORTED_LEAF SAMPLES")
    print("=" * 70)
    supp_df = res_df[res_df["category"] == "VALID_SUPPORTED_LEAF"]
    for _, r in supp_df.iterrows():
        changed = "CHANGED" if r["raw_pred"] != r["thresh_pred"] else "UNCHANGED"
        print(f"  - [{r['index']:02d}] {r['filename']:<30} | GT: {r['gt_crop']:<7} | Raw: {r['raw_pred']:<7} (p1={r['top1_prob']:.4f}, m={r['margin']:.4f}) -> Thresh: {r['thresh_pred']:<7} | {changed} | Final: {'CORRECT' if r['thresh_correct'] else 'ERROR'}")

    # Confusion matrix
    classes_5 = ["Potato", "Corn", "Tomato", "Apple", "Other"]
    print("\nRAW CONFUSION MATRIX (Rows: GT, Cols: Pred):")
    raw_cm = pd.crosstab(res_df["gt_crop"], res_df["raw_pred"]).reindex(index=classes_5, columns=classes_5, fill_value=0)
    print(raw_cm)

    print("\nTHRESHOLDED CONFUSION MATRIX (Rows: GT, Cols: Pred):")
    thresh_cm = pd.crosstab(res_df["gt_crop"], res_df["thresh_pred"]).reindex(index=classes_5, columns=classes_5, fill_value=0)
    print(thresh_cm)

    # Save detailed CSV for reporting
    csv_out = AUDIT_DIR / "e12_threshold_audit_results.csv"
    res_df.to_csv(csv_out, index=False)
    print(f"\nSaved detailed per-image results to: {csv_out}")


if __name__ == "__main__":
    main()
