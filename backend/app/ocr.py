from __future__ import annotations

from functools import lru_cache
from typing import Optional

import cv2
import numpy as np
from paddleocr import PaddleOCR


@lru_cache(maxsize=1)
def get_reader() -> PaddleOCR:
    return PaddleOCR(use_angle_cls=False, lang='en', use_gpu=False, show_log=False)


class OCRLabelSuggester:
    def __init__(self) -> None:
        self.reader = get_reader()

    def suggest_from_crop(self, crop: np.ndarray) -> tuple[Optional[str], Optional[float]]:
        if crop is None or crop.size == 0:
            return None, None

        if len(crop.shape) == 2:
            rgb = cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)

        result = self.reader.ocr(rgb, cls=False)
        if not result or not result[0]:
            return None, None

        best_text = None
        best_conf = -1.0
        for item in result[0]:
            if not item or len(item) < 2:
                continue
            recognized = item[1]
            if not recognized or len(recognized) < 2:
                continue
            text, conf = recognized[0], float(recognized[1])
            if conf > best_conf and text:
                best_text = text.strip()
                best_conf = conf

        if not best_text:
            return None, None
        return best_text[:1], best_conf
