from __future__ import annotations

import math
import uuid
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np

from .schemas import GlyphVariant
from .storage import STYLES_DIR, write_json


class VariationGenerator:
    def normalize(self, image: np.ndarray, size: int = 128) -> np.ndarray:
        coords = cv2.findNonZero(image)
        if coords is None:
            return np.zeros((size, size), dtype=np.uint8)
        x, y, w, h = cv2.boundingRect(coords)
        crop = image[y : y + h, x : x + w]
        scale = min((size - 20) / max(w, 1), (size - 20) / max(h, 1))
        resized = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        canvas = np.zeros((size, size), dtype=np.uint8)
        oy = (size - resized.shape[0]) // 2
        ox = (size - resized.shape[1]) // 2
        canvas[oy : oy + resized.shape[0], ox : ox + resized.shape[1]] = resized
        return canvas

    def augment(self, image: np.ndarray, variants: int = 5) -> List[np.ndarray]:
        outputs: List[np.ndarray] = []
        h, w = image.shape[:2]
        center = (w / 2, h / 2)
        for idx in range(variants):
            angle = np.random.uniform(-4.5, 4.5)
            scale = np.random.uniform(0.96, 1.04)
            tx = np.random.uniform(-3, 3)
            ty = np.random.uniform(-3, 3)
            matrix = cv2.getRotationMatrix2D(center, angle, scale)
            matrix[:, 2] += [tx, ty]
            transformed = cv2.warpAffine(image, matrix, (w, h), borderValue=0)
            if idx % 2 == 0:
                k = np.random.choice([1, 2])
                kernel = np.ones((k, k), np.uint8)
                transformed = cv2.dilate(transformed, kernel, iterations=1)
            else:
                transformed = cv2.GaussianBlur(transformed, (3, 3), 0)
                _, transformed = cv2.threshold(transformed, 40, 255, cv2.THRESH_BINARY)
            outputs.append(transformed)
        return outputs

    def build_style(self, style_name: str, labeled_segments: Dict[str, List[str]]) -> Dict:
        style_id = style_name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:8]
        style_dir = STYLES_DIR / style_id
        glyph_dir = style_dir / "glyphs"
        glyph_dir.mkdir(parents=True, exist_ok=True)

        glyphs: Dict[str, List[Dict]] = {}
        for symbol, segment_paths in labeled_segments.items():
            symbol_variants: List[Dict] = []
            for segment_path in segment_paths:
                img = cv2.imread(segment_path, cv2.IMREAD_GRAYSCALE)
                if img is None:
                    continue
                base = self.normalize(img)
                for augmented in self.augment(base, variants=5):
                    variant_id = str(uuid.uuid4())[:10]
                    out_path = glyph_dir / f"{symbol}_{variant_id}.png"
                    cv2.imwrite(str(out_path), augmented)
                    symbol_variants.append(
                        GlyphVariant(
                            id=variant_id,
                            symbol=symbol,
                            width=int(augmented.shape[1]),
                            height=int(augmented.shape[0]),
                            baseline=float(augmented.shape[0] * 0.82),
                            left_bearing=2.0,
                            right_bearing=4.0,
                            entry_point=[0.0, float(augmented.shape[0] * 0.65)],
                            exit_point=[float(augmented.shape[1]), float(augmented.shape[0] * 0.65)],
                            bitmap_path=str(out_path),
                        ).model_dump()
                    )
            glyphs[symbol] = symbol_variants

        manifest = {
            "style_id": style_id,
            "name": style_name,
            "glyphs": glyphs,
        }
        write_json(style_dir / "style.json", manifest)
        return manifest
