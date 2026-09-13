from typing import Optional, Dict
from dataclasses import dataclass


@dataclass
class DiseaseMetadata:
    """User-facing metadata associated with a disease classification."""
    display_name: str
    precaution: Optional[str] = None


class DiseaseMetadataService:
    """Backend-owned service for mapping canonical ML classes to user-facing metadata.

    The ML predictor produces a canonical class identifier (e.g. 'Potato Early Blight').
    The backend owns display_name, precaution, and future user-facing presentation data.
    """

    def __init__(self, registry: Optional[Dict[str, DiseaseMetadata]] = None):
        self._registry: Dict[str, DiseaseMetadata] = dict(registry) if registry else {}

    def register(self, predicted_class: str, display_name: str, precaution: Optional[str] = None) -> None:
        """Register or override metadata for a canonical class."""
        self._registry[predicted_class] = DiseaseMetadata(
            display_name=display_name,
            precaution=precaution,
        )

    def get_metadata(self, predicted_class: str) -> DiseaseMetadata:
        """Retrieve user-facing metadata for a canonical class.

        If the class is registered, returns the registered metadata.
        Otherwise, derives a clean, non-fabricated fallback display_name from the canonical string
        with precaution=None.
        """
        if predicted_class in self._registry:
            return self._registry[predicted_class]

        display_name = self._format_fallback_name(predicted_class)
        return DiseaseMetadata(display_name=display_name, precaution=None)

    @staticmethod
    def _format_fallback_name(predicted_class: str) -> str:
        """Format a canonical label into a clean display title without inventing fake diagnosis."""
        if not predicted_class:
            return "Unknown Condition"
        if "___" in predicted_class:
            parts = predicted_class.split("___", 1)
            crop = parts[0].replace("_", " ").strip().title()
            condition = parts[1].replace("_", " ").strip().title()
            return f"{crop} \u2014 {condition}"
        return predicted_class.replace("_", " ").strip().title()


# Canonical HYBRID-10 disease metadata registry
HYBRID_10_METADATA_REGISTRY: Dict[str, DiseaseMetadata] = {
    "Potato Early Blight": DiseaseMetadata(
        display_name="Potato \u2014 Early Blight",
        precaution="Apply copper-based fungicides, prune infected lower foliage, and ensure adequate plant spacing for airflow.",
    ),
    "Potato Late Blight": DiseaseMetadata(
        display_name="Potato \u2014 Late Blight",
        precaution="Immediately isolate or remove infected plants; apply protective fungicides (mancozeb/chlorothalonil) and avoid overhead watering.",
    ),
    "Potato Healthy": DiseaseMetadata(
        display_name="Potato \u2014 Healthy",
        precaution="No disease detected. Maintain standard watering and balanced fertilization practices.",
    ),
    "Corn Gray Leaf Spot": DiseaseMetadata(
        display_name="Corn \u2014 Gray Leaf Spot",
        precaution="Implement crop rotation with non-host crops, manage crop residue, and consider foliar fungicide application if lesions advance.",
    ),
    "Corn Healthy": DiseaseMetadata(
        display_name="Corn \u2014 Healthy",
        precaution="No disease detected. Continue standard crop scouting and weed management.",
    ),
    "Tomato Yellow Leaf Curl Virus": DiseaseMetadata(
        display_name="Tomato \u2014 Yellow Leaf Curl Virus",
        precaution="Manage whitefly populations using reflective mulches and insect netting; rogue and dispose of symptomatic plants promptly.",
    ),
    "Tomato Healthy": DiseaseMetadata(
        display_name="Tomato \u2014 Healthy",
        precaution="No disease detected. Maintain consistent drip irrigation and staking.",
    ),
    "Apple Scab": DiseaseMetadata(
        display_name="Apple \u2014 Scab",
        precaution="Rake and destroy fallen leaf litter; apply preventive fungicides during wet spring infection periods.",
    ),
    "Apple Cedar Rust": DiseaseMetadata(
        display_name="Apple \u2014 Cedar Apple Rust",
        precaution="Remove nearby cedar/juniper galls; apply targeted fungicides at the pink bud stage.",
    ),
    "Apple Healthy": DiseaseMetadata(
        display_name="Apple \u2014 Healthy",
        precaution="No disease detected. Continue routine orchard sanitation and seasonal pruning.",
    ),
}

# Default singleton instance for application runtime
_default_metadata_service = DiseaseMetadataService(registry=HYBRID_10_METADATA_REGISTRY)


def get_default_metadata_service() -> DiseaseMetadataService:
    """Access the default global disease metadata service instance."""
    return _default_metadata_service
