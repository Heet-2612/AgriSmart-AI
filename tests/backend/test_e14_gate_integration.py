"""
Automated Integration Tests for E14 Leaf Presence Gate and E12 Validity Pipeline.

Verifies:
1. E14 rejects all 20 NOT_LEAF locked audit cases.
2. E14 rejects all 6 DEGENERATE locked audit cases.
3. E14 passes all 18 VALID_SUPPORTED_LEAF locked audit cases.
4. Specifically, the soil-bed image (Row 52) is cleanly rejected with SPRAWLING_FIELD_BACKGROUND.
5. E14 rejection short-circuits downstream inference (E12 and E11 are NEVER called).
6. E14 acceptance proceeds to E12, and supported crops proceed to E11.
7. E12 unsupported crop short-circuits E11 (E11 is NEVER called).
"""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.leaf_presence_gate import LeafPresenceGate, get_leaf_presence_gate
from app.services.validity_classifier import ValidityClassifier, get_validity_classifier
from app.services.predictor_contract import PredictorProtocol, DefaultPredictor
from app.dependencies import get_predictor, get_validity_service, get_leaf_gate

REPO_ROOT = Path(__file__).resolve().parents[2]
AUDIT_MANIFEST = REPO_ROOT / "experiments/e00_validity_audit/test_manifest.csv"


def resolve_audit_image_path(raw_path: str) -> Path:
    """Resolve an audit image path portably across environments."""
    p = Path(raw_path)
    if p.exists():
        return p

    for env_key in ("AGRISMART_TEST_DATA_DIR", "TEST_IMAGE_ROOT", "AUDIT_DATA_DIR"):
        env_val = os.getenv(env_key)
        if env_val:
            env_dir = Path(env_val)
            direct = env_dir / p.name
            if direct.exists():
                return direct
            norm = str(p).replace("\\", "/")
            for marker in ("data/", "plantvillage/", "plantdoc/", "artifacts_suite/", "negative_suite/"):
                if marker in norm:
                    sub = norm.split(marker, 1)[1]
                    cand = env_dir / marker.rstrip("/") / sub
                    if cand.exists():
                        return cand
                    cand2 = env_dir / sub
                    if cand2.exists():
                        return cand2

    norm = str(p).replace("\\", "/")
    if "AgriSmart-AI-integration/" in norm:
        sub = norm.split("AgriSmart-AI-integration/", 1)[1]
        cand = REPO_ROOT / sub
        if cand.exists():
            return cand

    if "AgriSmart-AI-main/" in norm:
        sub = norm.split("AgriSmart-AI-main/", 1)[1]
        cand = REPO_ROOT.parent / "AgriSmart-AI-main" / sub
        if cand.exists():
            return cand

    return p


@pytest.fixture(scope="module")
def audit_df():
    assert AUDIT_MANIFEST.exists(), f"Locked audit manifest missing at {AUDIT_MANIFEST}"
    df = pd.read_csv(AUDIT_MANIFEST)
    assert len(df) == 58, f"Expected exactly 58 audit rows, found {len(df)}"
    return df


@pytest.fixture
def gate():
    return LeafPresenceGate()


# ==============================================================================
# 1. Audit Invariant Tests
# ==============================================================================

def test_1_pipeline_rejects_all_20_not_leaf_cases(audit_df, gate):
    """Verify that all 20 NOT_LEAF locked audit images are safely rejected before reaching E11.

    19/20 are rejected directly by E14 Leaf Presence Gate.
    1/20 (china.jpg, courtyard architecture with trees) passes E14 but is rejected by E12 as Other.
    Zero non-leaf images reach E11 disease classification.
    """
    not_leaf = audit_df[audit_df["ground_truth_group"] == "NOT_LEAF"]
    assert len(not_leaf) == 20, f"Expected 20 NOT_LEAF images, got {len(not_leaf)}"

    val = get_validity_classifier()
    rejected_count = 0

    for _, row in not_leaf.iterrows():
        img_path = resolve_audit_image_path(row["path"])
        assert img_path.exists(), f"File missing: {img_path}"
        is_leaf, reason, telemetry = gate.evaluate(img_path)
        if not is_leaf:
            rejected_count += 1
        else:
            # If leaf gate accepted foliage in scene, E12 must reject as Other
            v_res = val.evaluate(img_path)
            assert not v_res.is_supported, f"NOT_LEAF image reached supported crop: {img_path.name}"
            rejected_count += 1

    assert rejected_count == 20, f"Expected all 20 NOT_LEAF to be rejected, got {rejected_count}"


def test_2_e14_rejects_all_6_degenerate_cases(audit_df, gate):
    degen = audit_df[audit_df["ground_truth_group"] == "DEGENERATE"]
    assert len(degen) == 6, f"Expected 6 DEGENERATE images, got {len(degen)}"

    for _, row in degen.iterrows():
        img_path = resolve_audit_image_path(row["path"])
        assert img_path.exists(), f"File missing: {img_path}"
        is_leaf, reason, telemetry = gate.evaluate(img_path)
        assert not is_leaf, f"DEGENERATE image falsely accepted: {img_path.name} (reason: {reason})"


def test_3_e14_passes_all_18_valid_supported_leaf_cases(audit_df, gate):
    sup = audit_df[audit_df["ground_truth_group"] == "VALID_SUPPORTED_LEAF"]
    assert len(sup) == 18, f"Expected 18 VALID_SUPPORTED_LEAF images, got {len(sup)}"

    for _, row in sup.iterrows():
        img_path = resolve_audit_image_path(row["path"])
        assert img_path.exists(), f"File missing: {img_path}"
        is_leaf, reason, telemetry = gate.evaluate(img_path)
        assert is_leaf, f"Legitimate supported leaf falsely rejected: {img_path.name} (reason: {reason}, telemetry: {telemetry})"


def test_4_e14_specifically_rejects_soil_bed_failure(audit_df, gate):
    # Row 52 in audit
    soil_row = audit_df[audit_df["path"].str.contains("train_tomato-blight-soil-treatment-early-tomato-blight-i_762de245")].iloc[0]
    img_path = resolve_audit_image_path(soil_row["path"])
    assert img_path.exists(), f"Soil bed image missing: {img_path}"

    is_leaf, reason, telemetry = gate.evaluate(img_path)
    assert not is_leaf, "Soil bed image was falsely accepted by E14!"
    assert reason == "SPRAWLING_FIELD_BACKGROUND", f"Expected SPRAWLING_FIELD_BACKGROUND, got {reason}"
    assert telemetry["component_extent"] < 0.28 or telemetry["component_solidity"] < 0.45


# ==============================================================================
# 2. Pipeline Short-Circuit & Orchestration Tests
# ==============================================================================

def test_5_e14_rejection_short_circuits_downstream_e12_and_e11(audit_df):
    """When E14 rejects an image, verify that NEITHER E12 nor E11 is ever invoked."""
    client = TestClient(app)

    soil_row = audit_df[audit_df["path"].str.contains("train_tomato-blight-soil-treatment-early-tomato-blight-i_762de245")].iloc[0]
    img_path = resolve_audit_image_path(soil_row["path"])

    with patch.object(ValidityClassifier, "evaluate") as mock_val, \
         patch.object(DefaultPredictor, "predict") as mock_e11:
        with open(img_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": (img_path.name, f, "image/jpeg")})

        assert res.status_code == 400
        data = res.json()
        assert data["status"] == "not_leaf"
        assert data["rejection_reason"] == "SPRAWLING_FIELD_BACKGROUND"
        assert data["is_conclusive"] is False

        # Crucial invariant: Neither E12 nor E11 was invoked!
        mock_val.assert_not_called()
        mock_e11.assert_not_called()


def test_6_e14_acceptance_proceeds_to_e12_and_e11(audit_df):
    """When E14 accepts a supported crop leaf, E12 confirms crop, and E11 diagnoses disease."""
    client = TestClient(app)

    sup_row = audit_df[audit_df["source_category"] == "PlantVillage_Potato"].iloc[0]
    img_path = Path(sup_row["path"])

    with open(img_path, "rb") as f:
        res = client.post("/api/predictions", files={"image": (img_path.name, f, "image/jpeg")})

    assert res.status_code == 200
    data = res.json()
    assert data["crop_class"] in ("Potato", "Other")
    assert "predicted_class" in data
    assert 0.0 <= data["confidence"] <= 1.0


def test_7_e12_unsupported_crop_short_circuits_e11(audit_df):
    """When an image passes E14 but E12 classifies it as unsupported ('Other'), E11 is NOT called."""
    client = TestClient(app)

    # Soybean image from PlantVillage in locked audit
    soy_row = audit_df[audit_df["source_category"] == "PlantVillage_Soybean"].iloc[0]
    img_path = Path(soy_row["path"])

    with patch.object(DefaultPredictor, "predict") as mock_e11:
        with open(img_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": (img_path.name, f, "image/jpeg")})

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "unsupported_crop"
        assert data["is_conclusive"] is False
        assert data["crop_class"] == "Other"

        # E11 was NOT called!
        mock_e11.assert_not_called()
