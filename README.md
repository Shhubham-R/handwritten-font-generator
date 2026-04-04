# AI-Powered Handwritten Font Generator

A variation-based handwriting synthesis system that learns from scanned handwriting samples and renders typed text with realistic non-repetitive glyph selection, controllable randomness, and cursive-aware connections.

## What this project includes

- **Python backend** for image preprocessing, segmentation, labeling, dataset creation, augmentation, and rendering
- **SVG-first rendering engine** with variation-aware glyph selection
- **Cursive connection logic** using entry/exit anchors and smooth Bézier joins
- **FastAPI API** for upload, labeling, dataset building, and rendering
- **Minimal frontend** for sample upload, character correction, and text preview/export

## Architecture

1. **Input processing**
   - Image upload
   - Grayscale conversion
   - Denoising and adaptive contrast enhancement
   - Character candidate detection using contour/connected-component proposals
   - Semi-automatic labeling workflow

2. **Character modeling**
   - Multiple samples extracted for each symbol
   - Alignment normalization
   - Variation generation through geometric/stroke perturbations
   - Storage as raster + vector metadata

3. **Rendering engine**
   - Variation choice with anti-repetition heuristics
   - Dynamic spacing, tilt, baseline drift, and stroke width jitter
   - Optional cursive joins between connectable letters

4. **Output**
   - SVG
   - PNG via rasterization

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes

This is a custom handwriting renderer, **not** a TTF generator. That makes it easier to support per-character variation and context-aware joins.
