# Freeform Word Pipeline

## Goal

Use notebook-style handwriting photos to build a reviewable dataset of lines and words, instead of trying to extract individual letters directly.

## Pipeline

1. photo preprocessing
   - grayscale
   - contrast normalization
   - denoise
   - adaptive thresholding
   - optional perspective correction later
2. line segmentation
   - horizontal projection + connected components
3. word segmentation
   - connected components merged by distance within each line
4. recognition
   - use OCR/HTR on word crops first
   - line-level fallback
5. review dataset
   - store word crops, predicted text, confidence, source image

## Why this is better

- notebook pages are easier to segment into lines and words than letters
- word-level recognition can use context implicitly
- corrected words become reusable assets and training material
- the renderer can later prefer whole-word samples over letter assembly

## Future upgrade

Replace OCR recognizer with TrOCR or another handwriting-specific transformer model once the segmentation/review loop is stable.
