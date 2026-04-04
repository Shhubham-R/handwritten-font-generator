from __future__ import annotations

import uuid
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np

from .ocr import OCRLabelSuggester
from .storage import SEGMENTS_DIR, write_json


class FreeformPageService:
    def __init__(self) -> None:
        self.ocr = OCRLabelSuggester()

    def preprocess(self, image_path: Path) -> np.ndarray:
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f'Could not read image: {image_path}')
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        norm = cv2.normalize(blur, None, 0, 255, cv2.NORM_MINMAX)
        binary = cv2.adaptiveThreshold(norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 15)
        kernel = np.ones((2, 2), np.uint8)
        clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        return clean

    def segment_lines(self, binary: np.ndarray) -> List[Tuple[int, int]]:
        projection = np.sum(binary > 0, axis=1)
        lines: List[Tuple[int, int]] = []
        start = None
        threshold = max(8, int(binary.shape[1] * 0.01))
        for y, value in enumerate(projection):
            if value > threshold and start is None:
                start = y
            elif value <= threshold and start is not None:
                if y - start > 18:
                    lines.append((start, y))
                start = None
        if start is not None:
            lines.append((start, binary.shape[0] - 1))
        return lines

    def segment_words(self, line_img: np.ndarray, y_offset: int) -> List[Dict]:
        num_labels, _, stats, _ = cv2.connectedComponentsWithStats(line_img, connectivity=8)
        boxes = []
        for idx in range(1, num_labels):
            x, y, w, h, area = stats[idx]
            if area < 60 or w < 6 or h < 8:
                continue
            boxes.append([x, y, x + w, y + h])
        boxes.sort(key=lambda b: b[0])

        merged: List[List[int]] = []
        for box in boxes:
            if not merged:
                merged.append(box)
                continue
            prev = merged[-1]
            gap = box[0] - prev[2]
            vertical_overlap = min(prev[3], box[3]) - max(prev[1], box[1])
            if gap < 24 and vertical_overlap > 0:
                prev[2] = max(prev[2], box[2])
                prev[1] = min(prev[1], box[1])
                prev[3] = max(prev[3], box[3])
            else:
                merged.append(box)

        words: List[Dict] = []
        for idx, (x1, y1, x2, y2) in enumerate(merged):
            pad = 8
            xx1 = max(x1 - pad, 0)
            yy1 = max(y1 - pad, 0)
            xx2 = min(x2 + pad, line_img.shape[1])
            yy2 = min(y2 + pad, line_img.shape[0])
            words.append({
                'bbox': [int(xx1), int(yy1 + y_offset), int(xx2), int(yy2 + y_offset)],
                'crop_local': [int(xx1), int(yy1), int(xx2), int(yy2)],
                'index': int(idx),
            })
        return words

    def process_page(self, image_path: Path) -> Dict:
        binary = self.preprocess(image_path)
        page_id = str(uuid.uuid4())[:10]
        out_dir = SEGMENTS_DIR / page_id
        out_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_dir / 'preprocessed.png'), binary)

        lines = self.segment_lines(binary)
        line_items = []
        word_items = []

        for line_index, (y1, y2) in enumerate(lines):
            line_crop = binary[max(y1 - 4, 0):min(y2 + 4, binary.shape[0]), :]
            line_path = out_dir / f'line_{line_index:03d}.png'
            cv2.imwrite(str(line_path), line_crop)
            line_label, line_conf = self.ocr.suggest_from_crop(line_crop)
            line_record = {
                'line_index': int(line_index),
                'image_path': f"/data/segments/{page_id}/{line_path.name}",
                'bbox': [0, int(y1), int(binary.shape[1]), int(y2)],
                'predicted_text': line_label,
                'confidence': float(line_conf) if line_conf is not None else None,
                'words': [],
            }

            words = self.segment_words(line_crop, max(y1 - 4, 0))
            for word in words:
                x1, yy1, x2, yy2 = word['crop_local']
                word_crop = line_crop[yy1:yy2, x1:x2]
                word_path = out_dir / f"line_{line_index:03d}_word_{word['index']:03d}.png"
                cv2.imwrite(str(word_path), word_crop)
                text, conf = self.ocr.suggest_from_crop(word_crop)
                record = {
                    'line_index': int(line_index),
                    'word_index': int(word['index']),
                    'image_path': f"/data/segments/{page_id}/{word_path.name}",
                    'bbox': [int(v) for v in word['bbox']],
                    'predicted_text': text,
                    'confidence': float(conf) if conf is not None else None,
                }
                line_record['words'].append(record)
                word_items.append(record)

            line_items.append(line_record)

        manifest = {
            'page_id': page_id,
            'source_image': str(image_path),
            'preprocessed_image': f"/data/segments/{page_id}/preprocessed.png",
            'lines': line_items,
            'words': word_items,
        }
        write_json(out_dir / 'freeform_manifest.json', manifest)
        return manifest
