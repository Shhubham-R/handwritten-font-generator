from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


class PreprocessResult:
    def __init__(self, gray: np.ndarray, clean: np.ndarray, binary: np.ndarray):
        self.gray = gray
        self.clean = clean
        self.binary = binary


class HandwritingPreprocessor:
    def run(self, image_path: Path) -> PreprocessResult:
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not read image: {image_path}")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 12, 7, 21)
        contrast = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(denoised)
        binary = cv2.adaptiveThreshold(
            contrast,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            35,
            11,
        )
        kernel = np.ones((2, 2), np.uint8)
        clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        return PreprocessResult(gray=gray, clean=clean, binary=binary)
