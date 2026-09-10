from pathlib import Path
from typing import Any
from PIL import Image

def preprocess_image(image_input: Any, target_size: int = 224) -> Any:
    """Preprocess an input image for model evaluation."""
    if isinstance(image_input, (str, Path)):
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    return img.resize((target_size, target_size))
