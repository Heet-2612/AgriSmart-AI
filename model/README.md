# AgriSmart AI — Model Architecture & Pipelines

This directory houses the training orchestration, evaluation framework, domain-shift-aware augmentation transforms, and canonical inference interfaces for the AgriSmart AI system.

## Directory Structure

```text
model/
├── README.md
├── training/
│   ├── train.py          # Training loop orchestration
│   ├── evaluate.py       # Macro-F1, accuracy, and confusion matrix computation
│   ├── dataset.py        # Stratified dataset loader
│   ├── transforms.py     # Robust augmentation pipeline for field conditions
│   └── config.yaml       # Hyperparameters and experiment configuration
├── inference/
│   ├── predict.py        # Canonical predict(image_path) interface
│   └── preprocessing.py  # Image normalization and resizing
├── checkpoints/          # Saved model weights (.pt files)
│   └── .gitkeep
└── artifacts/            # Output figures, calibration plots, and training summaries
    └── .gitkeep
```

## Canonical Prediction Interface

Judges and downstream client services can run inference via:

```python
from model.inference.predict import predict

result = predict("path/to/leaf_image.jpg")
# Returns: {"predicted_class": "...", "confidence": 0.95, "model_version": "v1.0.0"}
```

*Note: In compliance with the SIH code of conduct, `predict()` safely raises `ModelNotReadyError` until the verified model checkpoint is trained and placed in `model/checkpoints/best_model.pt`.*

## Planned Model Comparison

- **E1:** ResNet-50 baseline
- **E2:** EfficientNet-B2
- **E3:** ConvNeXt-Tiny
- **E4:** Best candidate + stronger domain-shift-aware augmentation
- **E5:** Targeted fine-tuning of strongest candidate
