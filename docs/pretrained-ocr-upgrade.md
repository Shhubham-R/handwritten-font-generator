# Pretrained OCR Upgrade

## What changed

The original prototype used connected components only, with naive reading-order labeling. That is fast, but too weak for realistic handwriting.

This upgrade adds a pretrained OCR-assisted labeling layer using **PaddleOCR**.

## Why PaddleOCR first

- practical pretrained OCR stack
- solid English recognition
- works locally on CPU
- good balance between accuracy and integration effort
- avoids pulling an unnecessarily huge PyTorch stack for this prototype

## Expected behavior

- OCR suggestions are now used to prefill labels for detected segments
- confidence is surfaced so low-confidence crops can be corrected manually
- manual correction remains essential for messy handwriting

## Remaining limitations

- single-character handwriting still differs from scene-text OCR training data
- touching cursive letters may still be grouped incorrectly
- best next step after this is line-aware segmentation + recognizer fine-tuning on the user’s handwriting

## Future best-quality path

1. learned detector for handwriting regions/characters
2. recognizer fine-tuned on user samples
3. contour skeleton extraction for anchor detection
4. ligature/context-aware rendering
