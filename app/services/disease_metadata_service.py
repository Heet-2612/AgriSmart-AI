from typing import Optional, Dict
from dataclasses import dataclass
from app.schemas import DiseaseMetadata as GenAIDiseaseMetadata


@dataclass
class DiseaseMetadata:
    """User-facing metadata associated with a disease classification."""
    display_name: str
    precaution: Optional[str] = None


@dataclass
class E11DiseaseMetadata:
    """Authoritative metadata for E11 canonical classes."""
    display_name: str
    symptoms: str
    treatment: str
    precautions: str
    source: Optional[Dict[str, str]]


class DiseaseMetadataService:
    """Backend-owned service for mapping canonical ML classes to user-facing metadata.

    The ML predictor produces a canonical class identifier (e.g. 'Potato Early Blight').
    The backend owns display_name, precaution, and future user-facing presentation data.
    """

    def __init__(self, registry: Optional[Dict[str, DiseaseMetadata]] = None, e11_registry: Optional[Dict[str, E11DiseaseMetadata]] = None):
        self._registry: Dict[str, DiseaseMetadata] = dict(registry) if registry else {}
        self._e11_registry: Dict[str, E11DiseaseMetadata] = dict(e11_registry) if e11_registry else {}

    def register(self, predicted_class: str, display_name: str, precaution: Optional[str] = None) -> None:
        """Register or override metadata for a canonical class."""
        self._registry[predicted_class] = DiseaseMetadata(
            display_name=display_name,
            precaution=precaution,
        )

    def get_metadata(self, predicted_class: str) -> DiseaseMetadata:
        """Retrieve user-facing metadata for a canonical class (used by /api/predictions)."""
        # If it's an E11 class, construct it on the fly to preserve backward compatibility
        if predicted_class in self._e11_registry:
            e11_meta = self._e11_registry[predicted_class]
            return DiseaseMetadata(
                display_name=e11_meta.display_name,
                precaution=e11_meta.precautions,
            )

        if predicted_class in self._registry:
            return self._registry[predicted_class]

        display_name = self._format_fallback_name(predicted_class)
        return DiseaseMetadata(display_name=display_name, precaution=None)

    def get_genai_metadata(self, predicted_class: str) -> Optional[GenAIDiseaseMetadata]:
        """Retrieve GenAI-facing metadata mapped to Bhavya's Pydantic schema."""
        if predicted_class not in self._e11_registry:
            return None
        
        e11_meta = self._e11_registry[predicted_class]
        return GenAIDiseaseMetadata(
            display_name=e11_meta.display_name,
            symptoms=e11_meta.symptoms,
            treatment=e11_meta.treatment,
            precautions=e11_meta.precautions,
        )

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


# Canonical HYBRID-10 disease metadata registry (Authoritative E11 Metadata)
HYBRID_10_METADATA_REGISTRY: Dict[str, E11DiseaseMetadata] = {
    "Potato Early Blight": E11DiseaseMetadata(
        display_name="Potato — Early Blight",
        symptoms="Dark spots on older/lower foliage, concentric target-like rings, yellowing, and severe defoliation.",
        treatment="Fungicides only where warranted and according to local labels/guidance.",
        precautions="Remove infected foliage where appropriate, maintain plant vigor, use certified/pathogen-free planting material, rotate crops, practice sanitation, avoid overhead irrigation, ensure airflow, and avoid handling wet plants.",
        source={"organization": "University of Minnesota Extension", "title": "Early blight in tomato and potato", "url": "https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato"}
    ),
    "Potato Late Blight": E11DiseaseMetadata(
        display_name="Potato — Late Blight",
        symptoms="Large dark lesions on foliage/tubers, with cool/wet rapid development.",
        treatment="Appropriate disease-management/fungicide guidance.",
        precautions="Sanitation, use of certified seed, and planting resistant varieties.",
        source={"organization": "University of Minnesota Extension", "title": "Late blight of tomato and potato", "url": "https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/late-blight"}
    ),
    "Potato Healthy": E11DiseaseMetadata(
        display_name="Potato — Healthy",
        symptoms="[]",
        treatment="Not applicable.",
        precautions="Verified general prevention guidance. Maintain standard crop scouting and balanced fertilization.",
        source=None
    ),
    "Corn Gray Leaf Spot": E11DiseaseMetadata(
        display_name="Corn — Gray Leaf Spot",
        symptoms="Elongated/rectangular lesions parallel to veins.",
        treatment="Appropriate fungicide management according to local guidance.",
        precautions="Use resistant/tolerant hybrids, practice rotation, manage residue, and continue scouting.",
        source={"organization": "Cornell CALS", "title": "Gray Leaf Spot", "url": "https://cals.cornell.edu/field-crops/corn/diseases-of-corn/gray-leaf-spot"}
    ),
    "Corn Healthy": E11DiseaseMetadata(
        display_name="Corn — Healthy",
        symptoms="[]",
        treatment="Not applicable.",
        precautions="Verified general prevention guidance. Continue standard crop scouting.",
        source=None
    ),
    "Tomato Yellow Leaf Curl Virus": E11DiseaseMetadata(
        display_name="Tomato — Yellow Leaf Curl Virus",
        symptoms="Severe stunting, upward curling of leaf margins, and prominent yellowing between veins.",
        treatment="No curative treatment.",
        precautions="Management focuses on preventing spread and removing infected plants.",
        source={"organization": "NC State Extension", "title": "Tomato Yellow Leaf Curl Virus", "url": "https://content.ces.ncsu.edu/tomato-yellow-leaf-curl-virus"}
    ),
    "Tomato Healthy": E11DiseaseMetadata(
        display_name="Tomato — Healthy",
        symptoms="[]",
        treatment="Not applicable.",
        precautions="Verified general prevention guidance. Maintain standard crop scouting.",
        source=None
    ),
    "Apple Scab": E11DiseaseMetadata(
        display_name="Apple — Scab",
        symptoms="Olive-green/brown lesions, leaf yellowing/drop, corky/cracked/deformed fruit.",
        treatment="Fungicides protect healthy tissue rather than cure established lesions.",
        precautions="Sanitation, use resistant cultivars, and maintain an open canopy.",
        source={"organization": "University of Minnesota Extension", "title": "Apple scab", "url": "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/apple-scab"}
    ),
    "Apple Cedar Rust": E11DiseaseMetadata(
        display_name="Apple — Cedar Apple Rust",
        symptoms="Yellow to orange-red leaf spots, rust structures, and related fruit symptoms.",
        treatment="No chemical treatment recommended. Focus on prevention.",
        precautions="Use resistant cultivars, remove/prune infected material, avoid susceptible apple planting near cedar/juniper where practical.",
        source={"organization": "University of Minnesota Extension", "title": "Cedar-apple rust", "url": "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/cedar-apple-rust"}
    ),
    "Apple Healthy": E11DiseaseMetadata(
        display_name="Apple — Healthy",
        symptoms="[]",
        treatment="Not applicable.",
        precautions="Verified general prevention guidance. Continue routine orchard sanitation.",
        source=None
    ),
}

# Default singleton instance for application runtime
_default_metadata_service = DiseaseMetadataService(e11_registry=HYBRID_10_METADATA_REGISTRY)


def get_default_metadata_service() -> DiseaseMetadataService:
    """Access the default global disease metadata service instance."""
    return _default_metadata_service

