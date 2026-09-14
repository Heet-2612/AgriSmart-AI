"""
E14: Lightweight Leaf / Vegetation Presence Gate.

Deterministic CPU-only gate running before crop/validity and disease classification.
Determines whether an image contains a plausible plant/leaf region.

Guiding Principles:
1. Zero trainable parameters / zero neural network dependencies.
2. Fast execution (< 5 ms on CPU).
3. Pre-registered decision boundary strictly matching validated E14 candidate.
4. Primary goal: Filter out non-vegetation backgrounds, synthetic graphics, UI,
   and sprawling wide-shot field soil beds without sacrificing legitimate lab/field leaves.
"""

from typing import Tuple, Dict, Any, Union
from pathlib import Path
import cv2
import numpy as np
from PIL import Image


class LeafPresenceGate:
    """Lightweight colorimetric and morphological leaf presence gate."""

    def __init__(
        self,
        min_pixel_std: float = 5.0,
        min_laplacian_var: float = 2.0,
        min_green_fraction: float = 0.02,
        min_largest_component_frac: float = 0.05,
        max_sprawling_bbox_ratio: float = 0.80,
        min_sprawling_extent: float = 0.28,
        min_sprawling_solidity: float = 0.45,
    ):
        self.min_pixel_std = min_pixel_std
        self.min_laplacian_var = min_laplacian_var
        self.min_green_fraction = min_green_fraction
        self.min_largest_component_frac = min_largest_component_frac
        self.max_sprawling_bbox_ratio = max_sprawling_bbox_ratio
        self.min_sprawling_extent = min_sprawling_extent
        self.min_sprawling_solidity = min_sprawling_solidity

    def evaluate(self, image: Union[np.ndarray, Image.Image, str, Path]) -> Tuple[bool, str, Dict[str, Any]]:
        """Evaluate whether an input contains a plausible leaf/vegetation region.

        Args:
            image: RGB numpy array, PIL Image, or file path.

        Returns:
            (is_leaf: bool, decision_reason: str, telemetry: dict)
        """
        if isinstance(image, (str, Path)):
            img = Image.open(str(image)).convert("RGB")
            arr = np.array(img)
        elif isinstance(image, Image.Image):
            arr = np.array(image.convert("RGB"))
        elif isinstance(image, np.ndarray):
            arr = image
            if len(arr.shape) == 2:
                arr = cv2.cvtColor(arr, cv2.COLOR_GRAY2RGB)
            elif arr.shape[2] == 4:
                arr = cv2.cvtColor(arr, cv2.COLOR_RGBA2RGB)
        else:
            raise TypeError(f"Unsupported image type: {type(image)}")

        h, w, _ = arr.shape
        total_area = h * w
        telemetry: Dict[str, Any] = {}

        # 1. Degeneracy & Texture Check
        p_std = float(arr.std())
        telemetry["pixel_std"] = round(p_std, 2)
        if p_std < self.min_pixel_std:
            return False, "INVALID_DEGENERATE_IMAGE", telemetry

        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        telemetry["laplacian_var"] = round(lap_var, 2)
        if lap_var < self.min_laplacian_var:
            return False, "INVALID_DEGENERATE_IMAGE", telemetry

        # 2. Vegetation Foliage Mask in HSV
        hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)
        H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        green_mask = ((H >= 25) & (H <= 85) & (S >= 35) & (V >= 35)).astype(np.uint8)
        green_frac = float(green_mask.mean())
        telemetry["green_fraction"] = round(green_frac, 4)

        if green_frac < self.min_green_fraction:
            return False, "NO_VEGETATION", telemetry

        # 3. Connected Component Analysis
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(green_mask)
        if num_labels <= 1:
            return False, "NO_LEAF_COMPONENT", telemetry

        areas = stats[1:, cv2.CC_STAT_AREA]
        largest_idx = 1 + int(np.argmax(areas))
        lx, ly, lw, lh, larea = stats[largest_idx]
        largest_frac = float(larea) / float(total_area)
        telemetry["largest_component_fraction"] = round(largest_frac, 4)

        if largest_frac < self.min_largest_component_frac:
            return False, "LEAF_COMPONENT_TOO_SMALL", telemetry

        # 4. Sprawling Background / Field Soil-Bed Geometry Filter
        bw_ratio = float(lw) / float(w)
        bh_ratio = float(lh) / float(h)
        extent = float(larea) / float(max(lw * lh, 1))
        telemetry["bbox_width_ratio"] = round(bw_ratio, 3)
        telemetry["bbox_height_ratio"] = round(bh_ratio, 3)
        telemetry["component_extent"] = round(extent, 3)

        solidity = 1.0
        if bw_ratio > self.max_sprawling_bbox_ratio and bh_ratio > self.max_sprawling_bbox_ratio:
            comp_mask = (labels == largest_idx).astype(np.uint8)
            cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            c = max(cnts, key=cv2.contourArea) if len(cnts) > 0 else None
            if c is None or len(c) < 3:
                return False, "NO_LEAF_COMPONENT", telemetry

            hull = cv2.convexHull(c)
            hull_area = float(cv2.contourArea(hull))
            solidity = float(cv2.contourArea(c)) / max(hull_area, 1.0)
            telemetry["component_solidity"] = round(solidity, 3)

            # Rejection rule: When green pixels span >80% width and height,
            # close-up plant leaves exhibit solid fill (extent >= 0.28, solidity >= 0.45).
            # Distant crop beds / weed-scattered soil beds exhibit low fill and jagged disjoint borders.
            if extent < self.min_sprawling_extent or solidity < self.min_sprawling_solidity:
                return False, "SPRAWLING_FIELD_BACKGROUND", telemetry

        telemetry["component_solidity"] = round(solidity, 3)
        return True, "ACCEPT_PLAUSIBLE_LEAF", telemetry


_default_gate = None

def get_leaf_presence_gate() -> LeafPresenceGate:
    """Singleton getter for LeafPresenceGate."""
    global _default_gate
    if _default_gate is None:
        _default_gate = LeafPresenceGate()
    return _default_gate
