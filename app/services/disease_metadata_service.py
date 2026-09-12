from typing import Optional, Dict
from dataclasses import dataclass


@dataclass
class DiseaseMetadata:
    """User-facing metadata associated with a disease classification."""
    display_name: str
    precaution: Optional[str] = None


class DiseaseMetadataService:
    """Backend-owned service for mapping canonical ML classes to user-facing metadata.

    The ML predictor only produces a canonical class identifier (e.g. 'Tomato___Early_blight').
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
            return f"{crop} — {condition}"
        return predicted_class.replace("_", " ").strip().title()


# Default singleton instance for application runtime
_default_metadata_service = DiseaseMetadataService()


def get_default_metadata_service() -> DiseaseMetadataService:
    """Access the default global disease metadata service instance."""
    return _default_metadata_service
