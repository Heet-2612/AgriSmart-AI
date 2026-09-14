"""
E12: SigLIP 5-Way Crop Validity Classifier Service.

Evaluates crop species validity on plausible leaf images before disease classification.
Taxonomy: ['Potato', 'Corn', 'Tomato', 'Apple', 'Other']
Supported Crops: Potato, Corn, Tomato, Apple

Pre-Registered Policy:
- top1_prob < 0.60 OR (top1_prob - top2_prob) < 0.15 -> inconclusive_crop / Other
- top1_crop == 'Other' -> unsupported_crop
- Otherwise -> supported_crop (proceed to E11 disease classification)
"""

import os
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Any, Union, Optional, List, Tuple

import timm
import torch
import torch.nn as nn
from PIL import Image

from app.config import settings
from model.inference.preprocessing import preprocess_image_tensor


SUPPORTED_CROPS = {"Potato", "Corn", "Tomato", "Apple"}
MIN_CROP_CONFIDENCE = 0.60
MIN_CROP_MARGIN = 0.15


@dataclass
class ValidityResult:
    """Structured result from E12 Crop Validity Classifier."""
    is_supported: bool
    status: str  # "supported_crop", "unsupported_crop", "inconclusive_crop"
    crop_class: str
    confidence: float
    margin: float
    probabilities: Dict[str, float]
    model_version: str


class E12ValidityModel(nn.Module):
    """SigLIP ViT-B/16 with 5-way linear classification head."""

    def __init__(self, num_classes: int = 5):
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


class ValidityClassifier:
    """E12 Validity Classifier evaluating crop species before disease inference."""

    def __init__(self, checkpoint_path: Optional[Union[str, Path]] = None):
        target_path = Path(checkpoint_path or settings.VALIDITY_CHECKPOINT_PATH)
        if not target_path.exists() or not target_path.is_file():
            candidates = [
                Path("model/checkpoints/validity_classifier_baseline.pt"),
                Path("experiments/e12_siglip_validity/validity_classifier_baseline.pt"),
            ]
            for c in candidates:
                if c.exists() and c.is_file():
                    target_path = c
                    break
        self.checkpoint_path = target_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[E12ValidityModel] = None
        self.class_names: List[str] = ["Potato", "Corn", "Tomato", "Apple", "Other"]
        self.model_version: str = settings.VALIDITY_MODEL_VERSION
        self._load_model()

    def _load_model(self) -> None:
        if not self.checkpoint_path.exists() or not self.checkpoint_path.is_file():
            raise RuntimeError(
                f"E12 validity checkpoint not found at: '{self.checkpoint_path}'"
            )

        ckpt = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
        self.class_names = list(ckpt.get("class_names", self.class_names))

        model = E12ValidityModel(num_classes=len(self.class_names))
        raw_sd = ckpt["model_state_dict"]
        clean_sd = {k.replace("fc.", ""): v for k, v in raw_sd.items()}
        model.classifier.load_state_dict(clean_sd)

        model.to(self.device)
        model.eval()
        for p in model.parameters():
            p.requires_grad = False

        self.model = model

    def evaluate(self, image_path: Union[str, Path]) -> ValidityResult:
        """Evaluate crop validity on an image.

        Args:
            image_path: Path to the image file.

        Returns:
            ValidityResult containing classification details and gating decision.
        """
        img_path = Path(image_path)
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found at {img_path}")

        tensor = preprocess_image_tensor(img_path).to(self.device)

        with torch.inference_mode():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=-1).squeeze(0)

        probs_cpu = probs.cpu().numpy()
        top_indices = torch.topk(probs, k=2).indices.cpu().numpy()
        top1_idx, top2_idx = int(top_indices[0]), int(top_indices[1])

        top1_prob = float(probs_cpu[top1_idx])
        top2_prob = float(probs_cpu[top2_idx])
        top1_crop = self.class_names[top1_idx]
        margin = top1_prob - top2_prob

        prob_dict = {
            self.class_names[i]: round(float(probs_cpu[i]), 4)
            for i in range(len(self.class_names))
        }

        # Policy evaluation:
        # If top1_crop == "Other": unsupported crop
        if top1_crop == "Other":
            return ValidityResult(
                is_supported=False,
                status="unsupported_crop",
                crop_class="Other",
                confidence=round(top1_prob, 4),
                margin=round(margin, 4),
                probabilities=prob_dict,
                model_version=self.model_version,
            )

        # Pre-registered threshold policy:
        # top1 < 0.60 OR margin < 0.15 -> inconclusive_crop
        if top1_prob < MIN_CROP_CONFIDENCE or margin < MIN_CROP_MARGIN:
            return ValidityResult(
                is_supported=False,
                status="inconclusive_crop",
                crop_class=top1_crop,
                confidence=round(top1_prob, 4),
                margin=round(margin, 4),
                probabilities=prob_dict,
                model_version=self.model_version,
            )

        # Confident, supported crop
        return ValidityResult(
            is_supported=True,
            status="supported_crop",
            crop_class=top1_crop,
            confidence=round(top1_prob, 4),
            margin=round(margin, 4),
            probabilities=prob_dict,
            model_version=self.model_version,
        )


_validity_lock = threading.Lock()
_cached_validity_classifier: Optional[ValidityClassifier] = None

def get_validity_classifier() -> ValidityClassifier:
    """Singleton getter for ValidityClassifier."""
    global _cached_validity_classifier
    with _validity_lock:
        if _cached_validity_classifier is None:
            _cached_validity_classifier = ValidityClassifier()
        return _cached_validity_classifier
