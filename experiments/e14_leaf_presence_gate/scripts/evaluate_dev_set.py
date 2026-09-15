"""
E14: Development Set Evaluation Script (5,000 images).
Runs the pre-registered LeafPresenceGate on the 5,000 validation images.
"""

import time
import pandas as pd
import numpy as np
from pathlib import Path
from PIL import Image
import sys

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

from experiments.e14_leaf_presence_gate.leaf_presence_gate import LeafPresenceGate

def main():
    dev_path = REPO_ROOT / "experiments/e12_siglip_validity/validity_val_manifest.csv"
    df = pd.read_csv(dev_path)
    gate = LeafPresenceGate()

    t0 = time.time()
    records = []
    for idx, r in df.iterrows():
        p = r["path"]
        try:
            arr = np.array(Image.open(p).convert("RGB"))
            ok, reason, telemetry = gate.evaluate(arr)
        except Exception as e:
            ok, reason, telemetry = False, "ERROR", {}
        records.append({
            "domain": r["domain"],
            "class_name": r["class_name"],
            "passed": ok,
            "reason": reason,
        })
    elapsed = time.time() - t0
    res_df = pd.DataFrame(records)

    print(f"Total 5,000 dev images evaluated in {elapsed:.2f}s ({elapsed/len(df)*1000:.2f} ms/image)\n")

    print("=== PASS RATE BY DOMAIN ===")
    dom = res_df.groupby("domain")["passed"].agg(["count", "sum", "mean"]).reset_index()
    dom["pass_rate_pct"] = (dom["mean"] * 100).round(2)
    dom["rejection_rate_pct"] = ((1.0 - dom["mean"]) * 100).round(2)
    print(dom[["domain", "count", "sum", "pass_rate_pct", "rejection_rate_pct"]].to_string(index=False))

    print("\n=== PASS RATE BY CLASS ===")
    cls = res_df.groupby("class_name")["passed"].agg(["count", "sum", "mean"]).reset_index()
    cls["pass_rate_pct"] = (cls["mean"] * 100).round(2)
    cls["rejection_rate_pct"] = ((1.0 - cls["mean"]) * 100).round(2)
    print(cls[["class_name", "count", "sum", "pass_rate_pct", "rejection_rate_pct"]].to_string(index=False))

    # Supported crops
    supp = res_df[res_df["class_name"].isin(["Potato", "Corn", "Tomato", "Apple"])]
    s_acc = supp["passed"].mean() * 100.0
    s_frr = 100.0 - s_acc
    print(f"\nSupported Leaves (N={len(supp)}): Accepted={supp['passed'].sum()}/{len(supp)} ({s_acc:.2f}%), False Rejection Rate={(~supp['passed']).sum()}/{len(supp)} ({s_frr:.2f}%)")

    # Non-plant negatives
    neg = res_df[res_df["domain"].isin(["surroundings", "digital_ui", "degenerate"])]
    n_rej = (~neg["passed"]).mean() * 100.0
    n_fa = neg["passed"].mean() * 100.0
    print(f"Non-Plant Negatives (N={len(neg)}): Rejected={(~neg['passed']).sum()}/{len(neg)} ({n_rej:.2f}%), False Accept Rate={neg['passed'].sum()}/{len(neg)} ({n_fa:.2f}%)")

    # Rejection reasons for supported leaves
    supp_rejs = supp[~supp["passed"]]
    if len(supp_rejs) > 0:
        print(f"\nSupported Leaf Rejections Breakdown (N={len(supp_rejs)}):")
        print(supp_rejs["reason"].value_counts().to_string())

    # Rejection reasons for non-plants
    print("\nNon-Plant Rejections Breakdown:")
    print(neg["reason"].value_counts().to_string())

if __name__ == "__main__":
    main()
