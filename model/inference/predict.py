"""E11 SigLIP Production Inference Pipeline for AgriSmart AI.

Architecture:
- Backbone: Official SigLIP ViT-B/16 (vit_base_patch16_siglip_224, timm/v2_webli, 100% frozen)
- Classifier Head: 768 -> 10 linear projection (trained on complete eligible HYBRID-10 pool)
- Preprocessing: 224x224 bicubic resize, [-1.0, 1.0] range (mean=[0.5,0.5,0.5], std=[0.5,0.5,0.5])
- Execution: torch.inference_mode(), GPU when available with safe CPU fallback
- Model Lifecycle: Loaded once on first inference call and cached across requests
"""

import os
import threading
from pathlib import Path
from typing import Dict, Any, Union, Optional, Tuple, Sequence

import timm
import torch
import torch.nn as nn
from PIL import Image

from model.inference.preprocessing import preprocess_image_tensor
from model.inference.torch_config import resolve_inference_device, configure_inference_backends

# Canonical, immutable HYBRID-10 taxonomy ordering (Indices 0..9)
HYBRID10_CLASSES: Tuple[str, ...] = (
    "Potato Early Blight",
    "Potato Late Blight",
    "Potato Healthy",
    "Corn Gray Leaf Spot",
    "Corn Healthy",
    "Tomato Yellow Leaf Curl Virus",
    "Tomato Healthy",
    "Apple Scab",
    "Apple Cedar Rust",
    "Apple Healthy",
)

DEFAULT_MODEL_VERSION = "E11-SigLIP-HYBRID10-PRODUCTION"
DEFAULT_PIPELINE = "E11-SigLIP-ViT-B/16-LinearHead"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


class ModelNotReadyError(Exception):
    """Raised when inference is attempted but no trained model checkpoint exists."""
    pass


class E11SigLIPModel(nn.Module):
    """SigLIP ViT-B/16 with a 10-class linear classification head."""

    def __init__(self, num_classes: int = 10):
        super().__init__()
        self.backbone = timm.create_model(
            "vit_base_patch16_siglip_224",
            pretrained=True,
            num_classes=0,
        )
        for p in self.backbone.parameters():
            p.requires_grad = False
        self.classifier = nn.Linear(768, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feats = self.backbone(x)
        logits = self.classifier(feats)
        return logits


class E11SigLIPPredictor:
    """Production predictor caching the loaded SigLIP model across inferences."""

    def __init__(self, checkpoint_path: Union[str, Path], device: Optional[Union[str, torch.device]] = None):
        configure_inference_backends()
        self.checkpoint_path = Path(checkpoint_path)
        self.device = resolve_inference_device(device)
        self.model: Optional[E11SigLIPModel] = None
        self.class_names: Sequence[str] = HYBRID10_CLASSES
        self.model_version: str = DEFAULT_MODEL_VERSION
        self._load_model()

    def _load_model(self) -> None:
        if not self.checkpoint_path.exists() or not self.checkpoint_path.is_file():
            raise ModelNotReadyError(
                f"No trained model checkpoint found at '{self.checkpoint_path}'. "
                "In accordance with project integrity guidelines, model training must be completed "
                "with the verified HYBRID-10 training pool."
            )

        try:
            checkpoint = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
        except Exception as e:
            raise RuntimeError(f"Failed to load checkpoint file at '{self.checkpoint_path}': {e}")

        # Extract taxonomy / class names
        if "class_names" in checkpoint:
            self.class_names = list(checkpoint["class_names"])
        elif "taxonomy" in checkpoint:
            self.class_names = [item["class_name"] for item in checkpoint["taxonomy"]]

        # Canonical model version: E11-SigLIP-HYBRID10-PRODUCTION
        self.model_version = os.getenv("MODEL_VERSION", DEFAULT_MODEL_VERSION)

        # Instantiate SigLIP ViT-B/16 architecture
        try:
            model = E11SigLIPModel(num_classes=len(self.class_names))
        except Exception as e:
            raise RuntimeError(
                f"Failed to instantiate SigLIP ViT-B/16 backbone ('vit_base_patch16_siglip_224'). "
                f"Verify timm and network/cache availability: {e}"
            )

        # Load trained head weights (verified epoch 10 best validation weights)
        head_state_dict = checkpoint.get("model_state_dict")
        if head_state_dict is None:
            head_state_dict = checkpoint.get("final_epoch_state_dict")
        if head_state_dict is None:
            raise ValueError(f"Checkpoint '{self.checkpoint_path}' does not contain 'model_state_dict'")

        model.classifier.load_state_dict(head_state_dict)

        # Enforce canonical float32 precision, move to selected device, and set eval mode
        model.to(self.device).float()
        model.eval()
        for p in model.parameters():
            p.requires_grad = False

        self.model = model

    def predict(self, image_path: Union[str, Path]) -> Dict[str, Any]:
        """Perform inference on an image file path and return structured output."""
        img_path = Path(image_path)
        if not img_path.exists() or not img_path.is_file():
            raise FileNotFoundError(f"Image file not found at: {image_path}")

        if img_path.suffix.lower() not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Invalid image format '{img_path.suffix}'. Allowed: {ALLOWED_EXTENSIONS}")

        if self.model is None:
            raise ModelNotReadyError("Model is not initialized.")

        # Preprocess into SigLIP normalized float32 tensor (1, 3, 224, 224)
        input_tensor = preprocess_image_tensor(img_path).to(device=self.device, dtype=torch.float32)

        with torch.inference_mode():
            logits = self.model(input_tensor).float()
            probs = torch.softmax(logits, dim=-1).squeeze(0)

        probs_list = probs.cpu().tolist()
        top_idx = int(torch.argmax(probs).item())
        confidence = float(probs_list[top_idx])
        predicted_class = self.class_names[top_idx]

        probabilities = {
            self.class_names[i]: round(float(probs_list[i]), 4)
            for i in range(len(self.class_names))
        }

        return {
            "predicted_class": predicted_class,
            "confidence": round(confidence, 4),
            "probabilities": probabilities,
            "model_version": self.model_version,
            "pipeline": DEFAULT_PIPELINE,
            "leaf_detected": True,
            "roi_count": 1,
            "fallback_used": False,
        }


# Thread-safe global predictor cache
_predictor_lock = threading.Lock()
_cached_predictor: Optional[E11SigLIPPredictor] = None
_cached_checkpoint_path: Optional[str] = None


def get_predictor(checkpoint_path: Optional[Union[str, Path]] = None) -> E11SigLIPPredictor:
    """Retrieve or create the singleton predictor instance."""
    global _cached_predictor, _cached_checkpoint_path

    if checkpoint_path is None:
        checkpoint_path = os.getenv(
            "MODEL_CHECKPOINT_PATH",
            "model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt",
        )

    norm_path = str(Path(checkpoint_path).resolve())

    with _predictor_lock:
        if _cached_predictor is None or _cached_checkpoint_path != norm_path:
            _cached_predictor = E11SigLIPPredictor(norm_path)
            _cached_checkpoint_path = norm_path
        return _cached_predictor


def predict(
    image_path: Union[str, Path],
    checkpoint_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Canonical model prediction interface for AgriSmart AI."""
    img_path = Path(image_path)
    if not img_path.exists() or not img_path.is_file():
        raise FileNotFoundError(f"Image file not found at: {image_path}")

    if img_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid image format '{img_path.suffix}'. Allowed: {ALLOWED_EXTENSIONS}")

    if checkpoint_path is None:
        checkpoint_path = os.getenv(
            "MODEL_CHECKPOINT_PATH",
            "model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt",
        )

    ckpt = Path(checkpoint_path)
    if not ckpt.exists() or not ckpt.is_file():
        raise ModelNotReadyError(
            f"No trained model checkpoint found at '{checkpoint_path}'. "
            "In accordance with SIH guidelines, model training will be performed with the official "
            "organizer dataset and class labels. Fake predictions are strictly prohibited."
        )

    predictor = get_predictor(checkpoint_path)
    return predictor.predict(image_path)
