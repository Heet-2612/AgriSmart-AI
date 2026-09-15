"""E11 SigLIP Image Preprocessing Pipeline.

Strictly adheres to official SigLIP ViT-B/16 specifications:
- RGB color space conversion
- 224x224 spatial resolution via bicubic interpolation
- SigLIP tensor normalization: mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]
- Output range: [-1.0, 1.0]
"""

from pathlib import Path
from typing import Union, Any
from PIL import Image
import torch
from torchvision import transforms

SIGLIP_IMAGE_SIZE = (224, 224)
SIGLIP_MEAN = [0.5, 0.5, 0.5]
SIGLIP_STD = [0.5, 0.5, 0.5]

siglip_transform = transforms.Compose([
    transforms.Resize(
        SIGLIP_IMAGE_SIZE,
        interpolation=transforms.InterpolationMode.BICUBIC,
    ),
    transforms.ToTensor(),
    transforms.Normalize(mean=SIGLIP_MEAN, std=SIGLIP_STD),
])


def preprocess_image(image_input: Any, target_size: int = 224) -> Image.Image:
    """Legacy PIL image preprocessor for backward compatibility."""
    if isinstance(image_input, (str, Path)):
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    return img.resize((target_size, target_size), resample=Image.Resampling.BICUBIC)


def preprocess_image_tensor(image_input: Union[str, Path, Image.Image]) -> torch.Tensor:
    """Preprocess an image input into an E11 SigLIP batch tensor (1, 3, 224, 224)."""
    try:
        if isinstance(image_input, (str, Path)):
            p = Path(image_input)
            if not p.exists() or not p.is_file():
                raise FileNotFoundError(f"Image file not found at: {image_input}")
            img = Image.open(p).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")
    except (OSError, SyntaxError):
        raise ValueError("Unsupported or corrupted image file. Please upload a valid crop photo (JPG, PNG, WEBP).")

    tensor = siglip_transform(img)
    return tensor.unsqueeze(0).to(dtype=torch.float32)
