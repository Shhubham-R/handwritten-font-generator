from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import List

import cv2
import numpy as np

from .schemas import SegmentCandidate


@dataclass
class Component:
    x: int
    y: int
    w: int
    h: int
    area: int


class CharacterSegmenter:
    def segment(self, binary_image: np.ndarray, out_dir: Path) -> List[SegmentCandidate]:
        out_dir.mkdir(parents=True, exist_ok=True)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_image, connectivity=8)
        components: List[Component] = []

        for index in range(1, num_labels):
            x, y, w, h, area = stats[index]
            if area < 40 or w < 4 or h < 6:
                continue
            components.append(Component(x=x, y=y, w=w, h=h, area=area))

        components.sort(key=lambda c: (c.y // 40, c.x))
        segments: List[SegmentCandidate] = []

        for component in components:
            padding = 6
            x0 = max(component.x - padding, 0)
            y0 = max(component.y - padding, 0)
            x1 = component.x + component.w + padding
            y1 = component.y + component.h + padding
            crop = binary_image[y0:y1, x0:x1]
            segment_id = str(uuid.uuid4())
            segment_path = out_dir / f"{segment_id}.png"
            cv2.imwrite(str(segment_path), crop)
            segments.append(
                SegmentCandidate(
                    id=segment_id,
                    bbox=[int(x0), int(y0), int(x1), int(y1)],
                    image_path=str(segment_path),
                )
            )
        return segments
