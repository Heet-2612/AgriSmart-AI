"""Inference runtime backend and device configuration for AgriSmart AI.

Enforces cross-device determinism, numerical stability (FP32), and canonical device resolution.
"""

import os
from typing import Optional, Union
import torch


def configure_inference_backends() -> None:
    """Configure PyTorch backend settings for deterministic and FP32 inference."""
    # Enforce standard float32 precision for matmul (prevents TF32 truncation on Ampere+)
    if hasattr(torch, "set_float32_matmul_precision"):
        torch.set_float32_matmul_precision("highest")

    if torch.cuda.is_available():
        torch.backends.cuda.matmul.allow_tf32 = False
        torch.backends.cudnn.allow_tf32 = False
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def resolve_inference_device(device_setting: Optional[Union[str, torch.device]] = None) -> torch.device:
    """Resolve the active PyTorch device for model inference.

    Supported device_setting values:
    - "auto" (default): Selects CUDA if available, otherwise falls back to CPU.
    - "cpu": Explicitly forces CPU execution.
    - "cuda": Explicitly requires CUDA execution. If CUDA is not available,
              raises a RuntimeError rather than silently falling back.
    - torch.device instance: Used directly.
    """
    if isinstance(device_setting, torch.device):
        return device_setting

    device_str = (device_setting or os.getenv("INFERENCE_DEVICE", "auto")).strip().lower()

    if device_str == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError(
                "INFERENCE_DEVICE is configured to 'cuda', but CUDA is not available on this system. "
                "Explicit CUDA inference was requested; silent fallback to CPU is prohibited."
            )
        return torch.device("cuda")
    elif device_str == "cpu":
        return torch.device("cpu")
    elif device_str == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        raise ValueError(
            f"Invalid INFERENCE_DEVICE setting: '{device_str}'. Expected 'auto', 'cpu', or 'cuda'."
        )
