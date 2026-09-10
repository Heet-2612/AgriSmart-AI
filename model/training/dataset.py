"""Dataset loader interface for official SIH dataset splits."""
from pathlib import Path
from typing import Optional, Callable, List, Tuple
from PIL import Image

class CropDiseaseDataset:
    """Dataset wrapper for official organizer splits."""

    def __init__(
        self,
        root_dir: str,
        split: str = "train",
        transform: Optional[Callable] = None,
        class_names: Optional[List[str]] = None
    ):
        self.root_dir = Path(root_dir) / split
        self.transform = transform
        self.class_names = class_names or []
        self.samples: List[Tuple[Path, int]] = []

        if self.root_dir.exists():
            self._load_samples()

    def _load_samples(self):
        """Index images from class subdirectories adhering to organizer schema."""
        if not self.class_names:
            self.class_names = sorted([d.name for d in self.root_dir.iterdir() if d.is_dir()])

        class_to_idx = {cls_name: i for i, cls_name in enumerate(self.class_names)}
        for cls_name, idx in class_to_idx.items():
            cls_dir = self.root_dir / cls_name
            if cls_dir.exists():
                for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
                    for img_path in cls_dir.glob(ext):
                        self.samples.append((img_path, idx))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image=image)["image"]
        return image, label
