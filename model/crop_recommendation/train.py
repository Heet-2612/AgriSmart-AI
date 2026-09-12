"""
Crop Recommendation Model Training Pipeline.

Trains a scikit-learn RandomForestClassifier on verified agricultural soil and climate data.
Follows a reproducible 80/20 stratified train/test protocol with random_state=42.

Usage:
    python -m model.crop_recommendation.train [--data PATH_TO_CSV]
"""

import os
import sys
import json
import argparse
from datetime import datetime
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix

DEFAULT_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "data", "Crop_recommendation.csv"
)
DEFAULT_MODEL_DIR = os.path.dirname(__file__)
MODEL_FILE_NAME = "crop_model.joblib"
METADATA_FILE_NAME = "model_metadata.json"

FEATURE_COLUMNS = [
    "nitrogen",
    "phosphorus",
    "potassium",
    "temperature",
    "humidity",
    "ph",
    "rainfall",
]

COLUMN_MAPPING = {
    "n": "nitrogen",
    "nitrogen": "nitrogen",
    "p": "phosphorus",
    "phosphorus": "phosphorus",
    "k": "potassium",
    "potassium": "potassium",
    "temperature": "temperature",
    "humidity": "humidity",
    "ph": "ph",
    "rainfall": "rainfall",
    "label": "label",
    "crop": "label",
}


def load_and_preprocess_data(csv_path: str):
    """
    Load CSV dataset and validate feature columns.
    Returns (X, y, feature_names).
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Dataset not found at: {csv_path}\n"
            f"Please place the verified Crop Recommendation CSV file at '{csv_path}' before running training."
        )

    # Read CSV without requiring pandas if possible, or using standard csv / numpy
    import csv

    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            raise ValueError("CSV file is empty.")

        # Normalize header names
        normalized_header = [col.strip().lower() for col in header]
        header_map = {}
        for idx, col_name in enumerate(normalized_header):
            if col_name in COLUMN_MAPPING:
                header_map[COLUMN_MAPPING[col_name]] = idx

        # Verify all required features and label are present
        missing_features = [f for f in FEATURE_COLUMNS if f not in header_map]
        if missing_features:
            raise ValueError(
                f"CSV dataset missing required columns: {missing_features}. Found: {header}"
            )
        if "label" not in header_map:
            raise ValueError("CSV dataset missing target label column ('label' or 'crop').")

        for line_num, row in enumerate(reader, start=2):
            if not row or len(row) < len(header):
                continue
            try:
                feature_vals = [float(row[header_map[f]]) for f in FEATURE_COLUMNS]
                label_val = str(row[header_map["label"]]).strip()
                if not label_val:
                    continue
                rows.append((feature_vals, label_val))
            except ValueError as exc:
                raise ValueError(
                    f"Error parsing row {line_num} in {csv_path}: {exc}"
                )

    if len(rows) < 20:
        raise ValueError(f"Insufficient data samples in {csv_path} ({len(rows)} samples found).")

    X = np.array([r[0] for r in rows], dtype=float)
    y = np.array([r[1] for r in rows], dtype=str)

    return X, y, FEATURE_COLUMNS


def train_crop_model(
    data_path: str = DEFAULT_DATA_PATH,
    output_dir: str = DEFAULT_MODEL_DIR,
    model_version: str = "v1.0.0-rf-crop",
):
    """
    Execute end-to-end model training and evaluation.
    """
    print("=" * 70)
    print("AgriSmart AI - Crop Recommendation Model Training Pipeline")
    print("=" * 70)
    print(f"Data source: {data_path}")
    print(f"Target output directory: {output_dir}")

    X, y, feature_names = load_and_preprocess_data(data_path)
    classes = sorted(list(set(y)))
    print(f"Loaded {len(X)} records across {len(classes)} unique crop classes: {classes}")

    # Stratified 80/20 train/test split with random_state=42
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Fit Random Forest Classifier
    clf = RandomForestClassifier(
        n_estimators=100,
        criterion="gini",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Evaluate on held-out test split
    y_pred = clf.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    weighted_f1 = float(f1_score(y_test, y_pred, average="weighted"))
    clf_report = classification_report(y_test, y_pred, output_dict=True)
    conf_mat = confusion_matrix(y_test, y_pred, labels=classes).tolist()

    print("\n" + "-" * 70)
    print("Evaluation Metrics on Held-Out Test Set (20% Split):")
    print("-" * 70)
    print(f"Held-out Accuracy: {accuracy * 100:.2f}%")
    print(f"Macro F1-Score:    {macro_f1:.4f}")
    print(f"Weighted F1-Score: {weighted_f1:.4f}")

    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, MODEL_FILE_NAME)
    metadata_path = os.path.join(output_dir, METADATA_FILE_NAME)

    # Save model artifact
    joblib.dump(clf, model_path)
    print(f"\nModel checkpoint saved: {model_path}")

    # Save metadata
    metadata = {
        "model_version": model_version,
        "algorithm": "RandomForestClassifier",
        "n_estimators": 100,
        "random_state": 42,
        "training_timestamp": datetime.utcnow().isoformat() + "Z",
        "features": feature_names,
        "classes": classes,
        "n_classes": len(classes),
        "total_samples": len(X),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "test_accuracy": round(accuracy, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
            "classification_report": clf_report,
            "confusion_matrix": conf_mat,
        },
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Model metadata saved: {metadata_path}")
    print("=" * 70)

    return clf, metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train AgriSmart AI Crop Recommendation Random Forest Model"
    )
    parser.add_argument(
        "--data",
        type=str,
        default=DEFAULT_DATA_PATH,
        help="Path to verified Crop_recommendation.csv dataset",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=DEFAULT_MODEL_DIR,
        help="Directory where model artifact and metadata will be stored",
    )

    args = parser.parse_args()

    try:
        train_crop_model(data_path=args.data, output_dir=args.output_dir)
    except FileNotFoundError as e:
        print(f"\n[DATASET NOTICE] {e}")
        print("To train a real model, download an authentic Crop Recommendation dataset and place it at:")
        print(f"  {args.data}\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Training pipeline failed: {e}")
        sys.exit(1)
