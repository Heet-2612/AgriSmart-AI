"""
Tune and validate Candidate Leaf Presence Gate on 5,000-image development set.

Dataset: experiments/e12_siglip_validity/validity_val_manifest.csv (5,000 images)
Goal: Ensure Supported Leaf False Rejection is strictly minimized (< 1.0%),
      while maximizing Non-Plant Rejection (Surroundings, UI, Degenerate).
"""

import sys
import time
from pathlib import Path
import cv2
import numpy as np
import pandas as pd
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[3]
DEV_MANIFEST = REPO_ROOT / "experiments/e12_siglip_validity/validity_val_manifest.csv"


def evaluate_leaf_presence(arr: np.ndarray) -> tuple[bool, str, dict]:
    h, w, _ = arr.shape
    total_area = h * w

    # 1. Texture / Degeneracy check
    p_std = float(arr.std())
    if p_std < 5.0:
        return False, "REJECT_DEGENERATE_FLAT", {"p_std": p_std}

    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var < 2.0:
        return False, "REJECT_DEGENERATE_TEXTURE", {"lap_var": lap_var}

    # 2. Vegetation Color Mask (HSV)
    hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)
    H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    # Standard vegetation green
    green_mask = ((H >= 25) & (H <= 85) & (S >= 35) & (V >= 35)).astype(np.uint8)
    green_frac = float(green_mask.mean())

    if green_frac < 0.02:
        return False, "REJECT_NO_VEGETATION", {"green_frac": green_frac}

    # 3. Connected Component Analysis
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(green_mask)
    if num_labels <= 1:
        return False, "REJECT_NO_COMPONENT", {"green_frac": green_frac}

    areas = stats[1:, cv2.CC_STAT_AREA]
    largest_idx = 1 + int(np.argmax(areas))
    lx, ly, lw, lh, larea = stats[largest_idx]
    largest_frac = float(larea) / float(total_area)

    # Coherent leaf patch check (at least 5% contiguous leaf area)
    if largest_frac < 0.05:
        return False, "REJECT_COMPONENT_TOO_SMALL", {"largest_frac": largest_frac}

    # 4. Sprawling background / soil-bed filter
    extent = float(larea) / float(max(lw * lh, 1))
    bw_ratio = float(lw) / float(w)
    bh_ratio = float(lh) / float(h)

    solidity = 1.0
    if bw_ratio > 0.80 and bh_ratio > 0.80:
        comp_mask = (labels == largest_idx).astype(np.uint8)
        cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        c = max(cnts, key=cv2.contourArea) if len(cnts) > 0 else None
        if c is None or len(c) < 3:
            return False, "REJECT_DEGENERATE_CONTOUR", {"extent": extent}
        hull = cv2.convexHull(c)
        hull_area = float(cv2.contourArea(hull))
        solidity = float(cv2.contourArea(c)) / max(hull_area, 1.0)

        # A real leaf covering >80% width and height has high solidity and fill
        # Background soil/weeds spanning >80% width and height has low solidity and fill
        if extent < 0.28 or solidity < 0.45:
            return False, "REJECT_SPRAWLING_BACKGROUND", {
                "extent": extent,
                "solidity": solidity,
                "bw_ratio": bw_ratio,
                "bh_ratio": bh_ratio,
            }

    return True, "ACCEPT_LEAF", {
        "green_frac": green_frac,
        "largest_frac": largest_frac,
        "extent": extent,
        "solidity": solidity,
        "lap_var": lap_var,
        "p_std": p_std,
    }


def main():
    print("=" * 70)
    print("E14: TUNING & VALIDATING LEAF PRESENCE GATE ON 5,000 DEV IMAGES")
    print("=" * 70)

    df = pd.read_csv(DEV_MANIFEST)
    print(f"Loaded validation manifest: {DEV_MANIFEST.name} ({len(df)} samples)")

    t0 = time.time()
    results = []
    for idx, r in df.iterrows():
        p = r["path"]
        try:
            arr = np.array(Image.open(p).convert("RGB"))
            ok, reason, meta = evaluate_leaf_presence(arr)
        except Exception as e:
            ok, reason, meta = False, "ERROR_OPENING_IMAGE", {}

        results.append({
            "path": p,
            "domain": r["domain"],
            "class_name": r["class_name"],
            "passed": ok,
            "reason": reason,
        })
        if (idx + 1) % 1000 == 0:
            print(f"  Processed {idx + 1}/{len(df)} samples (elapsed: {time.time() - t0:.1f}s)...")

    res_df = pd.DataFrame(results)

    print("\n" + "=" * 70)
    print("VALIDATION PERFORMANCE BREAKDOWN")
    print("=" * 70)

    print("\n1. Pass Rate by Domain:")
    dom_summary = res_df.groupby("domain")["passed"].agg(["count", "sum", "mean"]).reset_index()
    dom_summary["rejection_rate"] = (1.0 - dom_summary["mean"]) * 100.0
    dom_summary["pass_rate"] = dom_summary["mean"] * 100.0
    print(dom_summary[["domain", "count", "sum", "pass_rate", "rejection_rate"]].to_string(index=False))

    print("\n2. Pass Rate by Crop Class:")
    cls_summary = res_df.groupby("class_name")["passed"].agg(["count", "sum", "mean"]).reset_index()
    cls_summary["rejection_rate"] = (1.0 - cls_summary["mean"]) * 100.0
    cls_summary["pass_rate"] = cls_summary["mean"] * 100.0
    print(cls_summary[["class_name", "count", "sum", "pass_rate", "rejection_rate"]].to_string(index=False))

    # Supported crop metrics (Potato, Corn, Tomato, Apple)
    supp = res_df[res_df["class_name"].isin(["Potato", "Corn", "Tomato", "Apple"])]
    supp_acc = supp["passed"].mean() * 100.0
    supp_frr = 100.0 - supp_acc
    print(f"\nSupported Crop Total: {len(supp)}")
    print(f"  Supported Accepted:                {supp['passed'].sum()}/{len(supp)} ({supp_acc:.2f}%)")
    print(f"  Supported False Rejection Rate:    {(~supp['passed']).sum()}/{len(supp)} ({supp_frr:.2f}%)")

    # Non-plant metrics (surroundings, digital_ui, degenerate)
    non_plant = res_df[res_df["domain"].isin(["surroundings", "digital_ui", "degenerate"])]
    non_plant_rej = (~non_plant["passed"]).mean() * 100.0
    non_plant_fa = non_plant["passed"].mean() * 100.0
    print(f"\nNon-Plant Negative Total: {len(non_plant)}")
    print(f"  Non-Plant Rejection Rate:          {(~non_plant['passed']).sum()}/{len(non_plant)} ({non_plant_rej:.2f}%)")
    print(f"  Non-Plant False Acceptance Rate:   {non_plant['passed'].sum()}/{len(non_plant)} ({non_plant_fa:.2f}%)")

    # Rejection reasons for supported leaves
    supp_rejs = supp[~supp["passed"]]
    if len(supp_rejs) > 0:
        print(f"\nSupported Leaf Rejections Breakdown (N={len(supp_rejs)}):")
        print(supp_rejs["reason"].value_counts())

    # Rejection reasons for non-plants
    print("\nNon-Plant Rejections Breakdown:")
    print(non_plant["reason"].value_counts())


if __name__ == "__main__":
    main()
