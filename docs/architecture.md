# Architecture

## Overview

This project treats handwriting as a **variation dataset plus renderer**, not as a conventional font.

## Pipeline

### 1. Upload and preprocessing
- Input: scanned handwritten sheet
- Steps:
  - grayscale conversion
  - denoising
  - CLAHE contrast enhancement
  - adaptive thresholding
  - morphological cleanup

### 2. Segmentation
- Current implementation uses connected components as a practical baseline.
- It is intentionally structured so a learned detector/segmenter can replace it later.
- Best next upgrades:
  - U-Net/Mask R-CNN segmentation for touching characters
  - line-aware grouping
  - interactive correction UI with merge/split actions

### 3. Labeling
- Semi-automatic default labels are suggested by reading order.
- User can correct labels before style creation.

### 4. Dataset generation
- Each labeled crop is normalized to a canonical canvas.
- Variation synthesis creates 5 rendered variants using:
  - small rotation shifts
  - translation shifts
  - scale changes
  - dilation/blur-based stroke variation

### 5. Rendering engine
- Maintains recent history per symbol to reduce obvious repeats.
- Adds:
  - per-glyph rotation jitter
  - baseline drift
  - uneven spacing
  - optional cursive joins

### 6. Output
- SVG-first output for scale independence
- PNG/JPG can be added by rasterizing SVG or by direct PIL/Cairo render

## Data format

```json
{
  "style_id": "my-style-a1b2c3d4",
  "name": "My Handwriting",
  "glyphs": {
    "a": [
      {
        "id": "v1",
        "symbol": "a",
        "width": 128,
        "height": 128,
        "baseline": 104.0,
        "left_bearing": 2,
        "right_bearing": 4,
        "entry_point": [0, 80],
        "exit_point": [128, 81],
        "bitmap_path": "..."
      }
    ]
  }
}
```

## Honest limitations in this first build

- Segmentation is not yet truly AI-based
- Cursive joins are heuristic, not stroke-topology-aware
- Vectorization is not yet full path extraction
- Labeling UX is minimal

## Best next upgrades

1. Replace connected-component segmentation with learned segmentation
2. Add merge/split/manual box editing in UI
3. Add path vectorization and skeleton extraction
4. Learn entry/exit stroke anchors from contour topology
5. Add ligature pairs and context-sensitive glyph selection
6. Add export templates for notebook/paper simulation
