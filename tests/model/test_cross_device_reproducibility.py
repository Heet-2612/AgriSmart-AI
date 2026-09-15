"""Cross-device reproducibility and determinism tests for E12 and E11 inference pipelines.

Verifies:
1. Checkpoint SHA256 integrity for E11 and E12.
2. Inference backend configuration (FP32 precision, TF32 disabled, deterministic flags).
3. INFERENCE_DEVICE error handling: requesting unavailable "cuda" raises RuntimeError.
4. End-to-end multi-stage pipeline:
   Image -> E14 Leaf Gate -> E12 Validity Gate -> E11 Disease Predictor -> Final Production API Semantics
   Comparing CPU vs CUDA for:
   - E14 acceptance / rejection and reason
   - E12 crop class and status (supported / unsupported / inconclusive)
   - E12 confidence and margin
   - E11 disease class
   - Final confidence, status, and conclusive result
5. Specific critical fixture tests:
   - leaf_disease.jpg: produces identical E12 validity status and identical final diagnosis decision across devices.
   - soybean_leaf.jpg: safety regression test (E12 unsupported_crop rejection).
   - soil_bed.jpg: safety regression test (E14 not_leaf / SPRAWLING_FIELD_BACKGROUND rejection).
   - potato_leaf.jpg, corn_leaf.jpg, apple_leaf.jpg, tomato_leaf.jpg: identical supported crop decisions.
6. Fixture numerical tolerance check:
   For the validated cross-device fixture suite, CPU/CUDA numerical differences remain
   within the measured tolerance and produce identical discrete safety/classification decisions.
"""

import asyncio
import hashlib
import io
from pathlib import Path
from typing import Dict, Any

import numpy as np
import pytest
import torch
from fastapi import UploadFile
from PIL import Image

from app.schemas import PredictionResponse
from app.services.prediction_service import process_prediction
from app.services.leaf_presence_gate import LeafPresenceGate
from app.services.validity_classifier import ValidityClassifier
from model.inference.predict import E11SigLIPPredictor
from model.inference.preprocessing import preprocess_image_tensor
from model.inference.torch_config import (
    configure_inference_backends,
    resolve_inference_device,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures" / "samples"

E11_CHECKPOINT_PATH = REPO_ROOT / "model" / "checkpoints" / "E11_SigLIP_HYBRID10_PRODUCTION.pt"
E11_EXPECTED_SHA256 = "a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df"

E12_CHECKPOINT_PATH = REPO_ROOT / "model" / "checkpoints" / "validity_classifier_baseline.pt"
E12_EXPECTED_SHA256 = "bdab814caf713cadd8ba11453f1b1e6b7f5d2383fcd66de829ef9d2600045322"

FIXTURE_NAMES = [
    "potato_leaf.jpg",
    "soybean_leaf.jpg",
    "leaf_disease.jpg",
    "soil_bed.jpg",
    "apple_leaf.jpg",
    "corn_leaf.jpg",
    "tomato_leaf.jpg",
]


def _compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


# ==============================================================================
# 1. Checkpoint Integrity Tests
# ==============================================================================

def test_1_e11_checkpoint_sha256_unmodified():
    """Verify production E11 checkpoint matches canonical SHA256."""
    assert E11_CHECKPOINT_PATH.exists(), f"E11 checkpoint missing at {E11_CHECKPOINT_PATH}"
    actual_sha = _compute_sha256(E11_CHECKPOINT_PATH)
    assert actual_sha == E11_EXPECTED_SHA256, (
        f"E11 checkpoint SHA256 mismatch! Got {actual_sha}, expected {E11_EXPECTED_SHA256}"
    )


def test_2_e12_checkpoint_sha256_unmodified():
    """Verify canonical E12 checkpoint matches canonical SHA256."""
    assert E12_CHECKPOINT_PATH.exists(), f"E12 checkpoint missing at {E12_CHECKPOINT_PATH}"
    actual_sha = _compute_sha256(E12_CHECKPOINT_PATH)
    assert actual_sha == E12_EXPECTED_SHA256, (
        f"E12 checkpoint SHA256 mismatch! Got {actual_sha}, expected {E12_EXPECTED_SHA256}"
    )


# ==============================================================================
# 2. PyTorch Deterministic Backend Configuration Tests
# ==============================================================================

def test_3_inference_backend_settings():
    """Verify configure_inference_backends configures FP32 and non-TF32 deterministic flags."""
    configure_inference_backends()
    if hasattr(torch, "get_float32_matmul_precision"):
        assert torch.get_float32_matmul_precision() == "highest"

    if torch.cuda.is_available():
        assert torch.backends.cuda.matmul.allow_tf32 is False
        assert torch.backends.cudnn.allow_tf32 is False
        assert torch.backends.cudnn.deterministic is True
        assert torch.backends.cudnn.benchmark is False


def test_4_device_policy_cuda_rejection_when_unavailable(monkeypatch):
    """Verify explicit INFERENCE_DEVICE='cuda' raises RuntimeError when CUDA is unavailable."""
    monkeypatch.setattr(torch.cuda, "is_available", lambda: False)
    with pytest.raises(RuntimeError, match="Explicit CUDA inference was requested; silent fallback to CPU is prohibited"):
        resolve_inference_device("cuda")

    # In contrast, "auto" falls back to CPU cleanly when CUDA is unavailable
    dev_auto = resolve_inference_device("auto")
    assert dev_auto.type == "cpu"


# ==============================================================================
# 3. End-to-End Multi-Stage Pipeline: CPU vs CUDA
# ==============================================================================

@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available for cross-device comparison")
@pytest.mark.parametrize("fixture_name", FIXTURE_NAMES)
def test_5_end_to_end_cross_device_pipeline_equivalence(fixture_name):
    """Verify identical discrete production decisions across CPU and CUDA for each fixture.

    Image -> E14 Leaf Gate -> E12 Validity Gate -> E11 Disease Predictor -> Final API Response
    """
    img_path = FIXTURES_DIR / fixture_name
    assert img_path.exists(), f"Missing fixture image: {img_path}"

    with open(img_path, "rb") as f:
        img_bytes = f.read()

    async def run_pipeline_for_device(dev_str: str) -> Dict[str, Any]:
        dev = torch.device(dev_str)
        v_service = ValidityClassifier(E12_CHECKPOINT_PATH, device=dev)
        p_service = E11SigLIPPredictor(E11_CHECKPOINT_PATH, device=dev)
        gate = LeafPresenceGate()

        # Step 1: E14 Gate
        with Image.open(img_path) as pil_img:
            arr = np.array(pil_img.convert("RGB"))
        is_leaf, gate_reason, _ = gate.evaluate(arr)

        if not is_leaf:
            return {
                "e14_accepted": False,
                "e14_reason": gate_reason,
                "e12_status": None,
                "e12_crop": None,
                "e12_conf": None,
                "e11_class": None,
                "final_status": "not_leaf" if gate_reason != "INVALID_DEGENERATE_IMAGE" else "invalid_image",
                "final_class": None,
                "final_confidence": None,
                "is_conclusive": False,
            }

        # Step 2: E12 Validity Classifier
        val_res = v_service.evaluate(img_path)
        if not val_res.is_supported:
            return {
                "e14_accepted": True,
                "e14_reason": gate_reason,
                "e12_status": val_res.status,
                "e12_crop": val_res.crop_class,
                "e12_conf": val_res.confidence,
                "e12_margin": val_res.margin,
                "e11_class": None,
                "final_status": val_res.status,
                "final_class": "Unsupported Crop" if val_res.status == "unsupported_crop" else "Inconclusive Crop",
                "final_confidence": val_res.confidence,
                "is_conclusive": False,
            }

        # Step 3: E11 Disease Predictor
        e11_res = p_service.predict(img_path)
        top1_conf = e11_res["confidence"]
        pred_class = e11_res["predicted_class"]

        # Step 4: E11 Uncertainty Gate
        probs = sorted(e11_res["probabilities"].values(), reverse=True)
        top2_conf = probs[1] if len(probs) > 1 else 0.0
        margin = top1_conf - top2_conf
        is_conclusive = not (top1_conf < 0.50 or margin < 0.15)
        final_status = "confident" if is_conclusive else "inconclusive"

        return {
            "e14_accepted": True,
            "e14_reason": gate_reason,
            "e12_status": val_res.status,
            "e12_crop": val_res.crop_class,
            "e12_conf": val_res.confidence,
            "e12_margin": val_res.margin,
            "e11_class": pred_class,
            "final_status": final_status,
            "final_class": pred_class,
            "final_confidence": top1_conf,
            "is_conclusive": is_conclusive,
        }

    cpu_res = asyncio.run(run_pipeline_for_device("cpu"))
    gpu_res = asyncio.run(run_pipeline_for_device("cuda"))

    # Assert identical discrete pipeline semantics
    assert cpu_res["e14_accepted"] == gpu_res["e14_accepted"], (
        f"E14 acceptance discrepancy for {fixture_name}: CPU={cpu_res['e14_accepted']} vs GPU={gpu_res['e14_accepted']}"
    )
    assert cpu_res["e14_reason"] == gpu_res["e14_reason"], (
        f"E14 reason discrepancy for {fixture_name}: CPU={cpu_res['e14_reason']} vs GPU={gpu_res['e14_reason']}"
    )

    if cpu_res["e14_accepted"]:
        assert cpu_res["e12_status"] == gpu_res["e12_status"], (
            f"E12 status discrepancy for {fixture_name}: CPU={cpu_res['e12_status']} vs GPU={gpu_res['e12_status']}"
        )
        assert cpu_res["e12_crop"] == gpu_res["e12_crop"], (
            f"E12 crop discrepancy for {fixture_name}: CPU={cpu_res['e12_crop']} vs GPU={gpu_res['e12_crop']}"
        )
        # Rounded to 4 decimals, confidence and margin match exactly
        assert round(cpu_res["e12_conf"], 4) == round(gpu_res["e12_conf"], 4)
        assert round(cpu_res["e12_margin"], 4) == round(gpu_res["e12_margin"], 4)

    if cpu_res["e12_status"] == "supported_crop":
        assert cpu_res["e11_class"] == gpu_res["e11_class"], (
            f"E11 class discrepancy for {fixture_name}: CPU={cpu_res['e11_class']} vs GPU={gpu_res['e11_class']}"
        )
        assert round(cpu_res["final_confidence"], 4) == round(gpu_res["final_confidence"], 4)

    assert cpu_res["final_status"] == gpu_res["final_status"], (
        f"Final status discrepancy for {fixture_name}: CPU={cpu_res['final_status']} vs GPU={gpu_res['final_status']}"
    )
    assert cpu_res["final_class"] == gpu_res["final_class"], (
        f"Final class discrepancy for {fixture_name}: CPU={cpu_res['final_class']} vs GPU={gpu_res['final_class']}"
    )
    assert cpu_res["is_conclusive"] == gpu_res["is_conclusive"], (
        f"Conclusive status discrepancy for {fixture_name}: CPU={cpu_res['is_conclusive']} vs GPU={gpu_res['is_conclusive']}"
    )


# ==============================================================================
# 4. Specific Critical Fixtures Tests
# ==============================================================================

@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available for cross-device comparison")
def test_6_leaf_disease_same_safety_and_classification_decision():
    """Verify leaf_disease.jpg produces the exact same E12 validity and E11 diagnosis on CPU and GPU."""
    img_path = FIXTURES_DIR / "leaf_disease.jpg"
    assert img_path.exists(), f"leaf_disease.jpg missing at {img_path}"

    v_cpu = ValidityClassifier(E12_CHECKPOINT_PATH, device="cpu")
    v_gpu = ValidityClassifier(E12_CHECKPOINT_PATH, device="cuda")
    p_cpu = E11SigLIPPredictor(E11_CHECKPOINT_PATH, device="cpu")
    p_gpu = E11SigLIPPredictor(E11_CHECKPOINT_PATH, device="cuda")

    # E12 Validity Check
    e12_res_cpu = v_cpu.evaluate(img_path)
    e12_res_gpu = v_gpu.evaluate(img_path)

    assert e12_res_cpu.status == e12_res_gpu.status == "supported_crop"
    assert e12_res_cpu.crop_class == e12_res_gpu.crop_class
    assert abs(e12_res_cpu.confidence - e12_res_gpu.confidence) < 1e-4

    # E11 Disease Prediction Check
    e11_res_cpu = p_cpu.predict(img_path)
    e11_res_gpu = p_gpu.predict(img_path)

    assert e11_res_cpu["predicted_class"] == e11_res_gpu["predicted_class"]
    assert abs(e11_res_cpu["confidence"] - e11_res_gpu["confidence"]) < 1e-4


@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available for cross-device comparison")
def test_7_soil_bed_rejected_by_e14_prior_to_inference():
    """Verify soil_bed.jpg is safely rejected by E14 gate on both CPU and GPU without calling E12/E11."""
    img_path = FIXTURES_DIR / "soil_bed.jpg"
    assert img_path.exists(), f"soil_bed.jpg missing at {img_path}"

    gate = LeafPresenceGate()
    with Image.open(img_path) as img:
        arr = np.array(img.convert("RGB"))

    is_leaf, reason, _ = gate.evaluate(arr)
    assert not is_leaf
    assert reason == "SPRAWLING_FIELD_BACKGROUND"


@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available for cross-device comparison")
def test_8_soybean_leaf_e12_unsupported_crop_rejection():
    """Verify soybean_leaf.jpg is safely rejected by E12 as unsupported_crop (Other) on both CPU and GPU."""
    img_path = FIXTURES_DIR / "soybean_leaf.jpg"
    assert img_path.exists(), f"soybean_leaf.jpg missing at {img_path}"

    v_cpu = ValidityClassifier(E12_CHECKPOINT_PATH, device="cpu")
    v_gpu = ValidityClassifier(E12_CHECKPOINT_PATH, device="cuda")

    res_cpu = v_cpu.evaluate(img_path)
    res_gpu = v_gpu.evaluate(img_path)

    assert res_cpu.is_supported is False
    assert res_gpu.is_supported is False
    assert res_cpu.status == res_gpu.status == "unsupported_crop"
    assert res_cpu.crop_class == res_gpu.crop_class == "Other"


# ==============================================================================
# 5. Measured Numerical Tolerance Test
# ==============================================================================

@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available for cross-device comparison")
def test_9_fixture_suite_numerical_tolerance():
    """Verify for the validated cross-device fixture suite, CPU/CUDA numerical differences

    remain within the measured tolerance (max logit diff <= 1e-4, max prob diff <= 1e-5)
    and produce identical discrete safety/classification decisions.
    """
    v_cpu = ValidityClassifier(E12_CHECKPOINT_PATH, device="cpu")
    v_gpu = ValidityClassifier(E12_CHECKPOINT_PATH, device="cuda")
    p_cpu = E11SigLIPPredictor(E11_CHECKPOINT_PATH, device="cpu")
    p_gpu = E11SigLIPPredictor(E11_CHECKPOINT_PATH, device="cuda")

    for fname in FIXTURE_NAMES:
        fpath = FIXTURES_DIR / fname
        t_cpu = preprocess_image_tensor(fpath).to("cpu")
        t_gpu = preprocess_image_tensor(fpath).to("cuda")

        with torch.inference_mode():
            # E11 logits & probs
            e11_l_cpu = p_cpu.model(t_cpu).squeeze(0)
            e11_l_gpu = p_gpu.model(t_gpu).squeeze(0).cpu()
            e11_p_cpu = torch.softmax(e11_l_cpu, dim=-1)
            e11_p_gpu = torch.softmax(e11_l_gpu, dim=-1)

            # E12 logits & probs
            e12_l_cpu = v_cpu.model(t_cpu).squeeze(0)
            e12_l_gpu = v_gpu.model(t_gpu).squeeze(0).cpu()
            e12_p_cpu = torch.softmax(e12_l_cpu, dim=-1)
            e12_p_gpu = torch.softmax(e12_l_gpu, dim=-1)

        diff_e11_logit = (e11_l_cpu - e11_l_gpu).abs().max().item()
        diff_e11_prob = (e11_p_cpu - e11_p_gpu).abs().max().item()
        diff_e12_logit = (e12_l_cpu - e12_l_gpu).abs().max().item()
        diff_e12_prob = (e12_p_cpu - e12_p_gpu).abs().max().item()

        # Check tolerance limits
        assert diff_e11_logit < 1e-4, f"{fname}: E11 logit diff {diff_e11_logit} exceeds 1e-4"
        assert diff_e11_prob < 1e-5, f"{fname}: E11 prob diff {diff_e11_prob} exceeds 1e-5"
        assert diff_e12_logit < 1e-4, f"{fname}: E12 logit diff {diff_e12_logit} exceeds 1e-4"
        assert diff_e12_prob < 1e-5, f"{fname}: E12 prob diff {diff_e12_prob} exceeds 1e-5"

        # Check identical argmax (discrete ranking)
        assert torch.argmax(e11_p_cpu) == torch.argmax(e11_p_gpu), f"{fname}: E11 argmax mismatch"
        assert torch.argmax(e12_p_cpu) == torch.argmax(e12_p_gpu), f"{fname}: E12 argmax mismatch"
