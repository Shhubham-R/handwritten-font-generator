from __future__ import annotations

import uuid
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np
import svgwrite

from .storage import DATA_DIR, SEGMENTS_DIR, STYLES_DIR, UPLOADS_DIR, write_json
from .templates import build_templates

TEMPLATES = {template['template_id']: template for template in build_templates()}
TEMPLATE_DIR = DATA_DIR / 'templates'
TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)


class CaptureSheetService:
    def list_templates(self) -> List[Dict]:
        return list(TEMPLATES.values())

    def render_template_svg(self, template_id: str) -> Path:
        template = TEMPLATES[template_id]
        out_path = TEMPLATE_DIR / f"{template_id}.svg"
        drawing = svgwrite.Drawing(filename=str(out_path), size=(template['page_width'], template['page_height']))
        drawing.add(drawing.rect(insert=(0, 0), size=(template['page_width'], template['page_height']), fill='white'))
        drawing.add(drawing.text(template['name'], insert=(60, 80), font_size='36px', font_family='Arial', fill='#111'))
        drawing.add(drawing.text('Write neatly inside each box. Use dark ink on white paper.', insert=(60, 120), font_size='20px', font_family='Arial', fill='#444'))

        for slot in template['slots']:
            drawing.add(drawing.rect(insert=(slot['x'], slot['y']), size=(slot['width'], slot['height']), rx=10, ry=10, fill='none', stroke='#222', stroke_width=2))
            drawing.add(drawing.text(slot['label'], insert=(slot['x'] + 12, slot['y'] + 24), font_size='20px', font_family='Arial', fill='#666'))
            baseline_y = slot['y'] + slot['height'] - 18
            drawing.add(drawing.line((slot['x'] + 12, baseline_y), (slot['x'] + slot['width'] - 12, baseline_y), stroke='#d1d5db', stroke_width=1))
            drawing.add(drawing.text(slot['key'], insert=(slot['x'] + slot['width'] - 90, slot['y'] + 24), font_size='12px', font_family='monospace', fill='#999'))

        drawing.save()
        return out_path

    def extract_from_sheet(self, template_id: str, image_path: Path) -> Dict:
        template = TEMPLATES[template_id]
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f'Could not read image: {image_path}')

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        normalized = cv2.resize(gray, (template['page_width'], template['page_height']))

        sheet_id = str(uuid.uuid4())[:10]
        out_dir = SEGMENTS_DIR / sheet_id
        out_dir.mkdir(parents=True, exist_ok=True)
        extracted: List[Dict] = []

        for slot in template['slots']:
            x, y, w, h = slot['x'], slot['y'], slot['width'], slot['height']
            crop = normalized[y:y+h, x:x+w]
            inner = crop[20:h-10, 10:w-10]
            _, binary = cv2.threshold(inner, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            path = out_dir / f"{slot['key']}.png"
            cv2.imwrite(str(path), binary)
            extracted.append({
                'slot_key': slot['key'],
                'label': slot['label'],
                'kind': slot['kind'],
                'image_path': f"/data/segments/{sheet_id}/{slot['key']}.png",
            })

        manifest = {
            'sheet_id': sheet_id,
            'template_id': template_id,
            'items': extracted,
        }
        write_json(out_dir / 'manifest.json', manifest)
        return manifest

    def build_dataset_from_sheets(self, style_name: str, sheets: List[Dict]) -> Dict:
        style_id = style_name.lower().replace(' ', '-') + '-' + str(uuid.uuid4())[:8]
        manifest = {
            'style_id': style_id,
            'name': style_name,
            'chars': {},
            'ligatures': {},
            'words': {},
        }
        for sheet in sheets:
            for item in sheet['items']:
                bucket = item['kind'] + 's'
                manifest.setdefault(bucket, {})
                manifest[bucket].setdefault(item['label'], []).append(item['image_path'])

        style_dir = STYLES_DIR / style_id
        style_dir.mkdir(parents=True, exist_ok=True)
        write_json(style_dir / 'capture_style.json', manifest)
        return manifest
