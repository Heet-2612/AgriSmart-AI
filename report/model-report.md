# AgriSmart AI Model Report

## Task

Crop-disease image classification.

## Dataset & Split

* **Dataset source:** TBD — official organizer source to be confirmed
* **Dataset licence:** TBD
* **Number of classes:** TBD
* **Training size:** TBD
* **Validation size:** TBD
* **Test size:** TBD
* **Exact split:** TBD
* **Organizer-provided split:** TBD

## Model / Approach

* **Architecture:** Deep Convolutional / Vision Transformer Backbones (ResNet-50, EfficientNet-B2, ConvNeXt-Tiny)
* **Backbone:** Candidate exploration pending training experiments
* **Pretrained weights:** ImageNet-1K / ImageNet-21K transfer learning
* **Input resolution:** 224x224
* **Key hyperparameters:** AdamW optimizer, Cosine Annealing scheduler, learning rate 3e-4, batch size 32
* **Augmentation:** Field-robustness transforms (RandomResizedCrop, Flip, Rotate90, ColorJitter, GaussianBlur, CoarseDropout)

## Metric & Result

> Model training pending. No experimental metrics are available yet.

| Model | Macro-F1 | Accuracy |
| :--- | :---: | :---: |
| ResNet-50 | TBD | TBD |
| EfficientNet-B2 | TBD | TBD |
| ConvNeXt-Tiny | TBD | TBD |

### Confusion Matrix

TBD — Model training pending. No experimental metrics are available yet.

### Per-class Precision

TBD — Model training pending. No experimental metrics are available yet.

### Per-class Recall

TBD — Model training pending. No experimental metrics are available yet.

*Note: In compliance with the SIH Code of Ethics, no fake metrics or fabricated confusion matrices are reported.*

## Baseline

* **Organizer baseline:** TBD
* **Our baseline:** TBD
* **Difference:** TBD

## Limitations

* **Lab-to-field domain shift:** Discrepancies between controlled laboratory photography and farmer field-captured imagery (complex backgrounds, varying sun angles, shadow interference).
* **Visually similar disease classes:** Early-stage foliar spots across related pathogens can exhibit nearly indistinguishable phenotypic traits.
* **Lighting/background variation:** Extreme exposure differences and soil/foliage background clutter.
* **Image quality:** Motion blur and low-resolution capture from budget mobile sensors.
* **Limited generalization outside the provided dataset:** Predictions outside verified crop classes require out-of-distribution detection.
