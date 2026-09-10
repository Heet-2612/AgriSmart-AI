"""Domain-shift-aware augmentation transforms for field condition robustness."""
from typing import Any

def get_train_transforms(image_size: int = 224) -> Any:
    """Construct augmentation pipeline designed for field variation (lighting, angles, occlusion)."""
    try:
        import albumentations as A
        from albumentations.pytorch import ToTensorV2

        return A.Compose([
            A.RandomResizedCrop(height=image_size, width=image_size, scale=(0.8, 1.0)),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.RandomRotate90(p=0.5),
            A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.5),
            A.GaussianBlur(blur_limit=(3, 5), p=0.1),
            A.CoarseDropout(max_holes=4, max_height=16, max_width=16, p=0.2),
            A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ToTensorV2()
        ])
    except ImportError:
        return None

def get_val_transforms(image_size: int = 224) -> Any:
    """Standard deterministic validation/test preprocessing."""
    try:
        import albumentations as A
        from albumentations.pytorch import ToTensorV2

        return A.Compose([
            A.Resize(height=image_size, width=image_size),
            A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ToTensorV2()
        ])
    except ImportError:
        return None
