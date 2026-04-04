from __future__ import annotations

import base64
import random
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from PIL import Image
import svgwrite

from .schemas import RenderRequest
from .storage import OUTPUTS_DIR, STYLES_DIR, read_json


class VariationSelector:
    def __init__(self) -> None:
        self.history: Dict[str, List[str]] = {}

    def choose(self, symbol: str, variants: List[Dict], randomness: float) -> Optional[Dict]:
        if not variants:
            return None
        recent = set(self.history.get(symbol, [])[-2:])
        pool = [v for v in variants if v["id"] not in recent] or variants
        if randomness < 0.15:
            chosen = pool[0]
        else:
            chosen = random.choice(pool)
        self.history.setdefault(symbol, []).append(chosen["id"])
        self.history[symbol] = self.history[symbol][-5:]
        return chosen


class HandwritingRenderer:
    def __init__(self) -> None:
        self.selector = VariationSelector()

    def load_style(self, style_id: str) -> Dict:
        return read_json(STYLES_DIR / style_id / "style.json")

    def render_svg(self, request: RenderRequest) -> Tuple[str, str]:
        style = self.load_style(request.style_id)
        width = request.line_width
        height = max(240, request.font_size * 3)
        drawing = svgwrite.Drawing(size=(width, height))
        if request.page == "ruled":
            for y in range(50, height, int(request.font_size * 1.4)):
                drawing.add(drawing.line((0, y), (width, y), stroke="#d7e5ff", stroke_width=1))

        x = 30
        baseline = request.font_size * 1.6
        prev_exit = None

        for char in request.text:
            if char == "\n":
                baseline += request.font_size * 1.5
                x = 30
                prev_exit = None
                continue
            if char == " ":
                x += request.font_size * 0.45
                prev_exit = None
                continue

            variants = style["glyphs"].get(char) or style["glyphs"].get(char.lower()) or []
            chosen = self.selector.choose(char, variants, request.randomness)
            if not chosen:
                x += request.font_size * 0.35
                prev_exit = None
                continue

            image_path = Path(chosen["bitmap_path"])
            image = Image.open(image_path).convert("L")
            rgba = Image.new("RGBA", image.size, (255, 255, 255, 0))
            rgba.putalpha(image)
            buffer = BytesIO()
            rgba.save(buffer, format="PNG")
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")

            glyph_h = request.font_size * random.uniform(0.92, 1.08)
            glyph_w = glyph_h * (chosen["width"] / max(chosen["height"], 1))
            y = baseline - glyph_h + random.uniform(-3, 3)
            rotation = random.uniform(-2.5, 2.5) * request.randomness

            if request.connect_cursive and prev_exit and chosen.get("entry_point"):
                join_start = prev_exit
                join_end = (x + 3, y + glyph_h * 0.65)
                cx1 = join_start[0] + 10
                cy1 = join_start[1]
                cx2 = join_end[0] - 10
                cy2 = join_end[1]
                drawing.add(
                    drawing.path(
                        d=f"M {join_start[0]},{join_start[1]} C {cx1},{cy1} {cx2},{cy2} {join_end[0]},{join_end[1]}",
                        fill="none",
                        stroke="#111",
                        stroke_width=1.6,
                        stroke_linecap="round",
                    )
                )

            image_tag = drawing.image(
                href=f"data:image/png;base64,{encoded}",
                insert=(x, y),
                size=(glyph_w, glyph_h),
            )
            image_tag.rotate(rotation, center=(x + glyph_w / 2, y + glyph_h / 2))
            drawing.add(image_tag)

            prev_exit = (x + glyph_w, y + glyph_h * 0.65)
            x += glyph_w * random.uniform(0.72, 0.88)

            if x > width - request.font_size:
                baseline += request.font_size * 1.5
                x = 30
                prev_exit = None

        output_id = f"render_{random.randint(1000, 9999)}"
        output_path = OUTPUTS_DIR / f"{output_id}.svg"
        drawing.saveas(output_path)
        return output_id, str(output_path)
