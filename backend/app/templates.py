from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List


@dataclass
class CaptureSlot:
    key: str
    label: str
    kind: str
    x: int
    y: int
    width: int
    height: int


@dataclass
class CaptureTemplate:
    template_id: str
    name: str
    page_width: int
    page_height: int
    slots: List[CaptureSlot]

    def to_dict(self) -> Dict:
        return {
            "template_id": self.template_id,
            "name": self.name,
            "page_width": self.page_width,
            "page_height": self.page_height,
            "slots": [asdict(slot) for slot in self.slots],
        }


LOWER = list("abcdefghijklmnopqrstuvwxyz")
UPPER = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
DIGITS = list("0123456789")
PUNCT = list(".,!?;:-()'\"")
LIGATURES = ["th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ch", "sh", "oo", "ll", "ing", "ion"]
WORDS = ["the", "and", "with", "animal", "hello", "thanks", "because", "quick", "brown", "fox"]


def _grid_slots(items: List[str], kind: str, start_y: int, cols: int = 4, repetitions: int = 3) -> List[CaptureSlot]:
    slots: List[CaptureSlot] = []
    box_w = 220
    box_h = 90
    gutter_x = 24
    gutter_y = 22
    left = 60

    expanded: List[tuple[str, str]] = []
    for item in items:
        for rep in range(repetitions):
            expanded.append((f"{item}_{rep+1}", item))

    for idx, (key, label) in enumerate(expanded):
        row = idx // cols
        col = idx % cols
        x = left + col * (box_w + gutter_x)
        y = start_y + row * (box_h + gutter_y)
        slots.append(CaptureSlot(key=key, label=label, kind=kind, x=x, y=y, width=box_w, height=box_h))
    return slots


def build_templates() -> List[Dict]:
    templates = [
        CaptureTemplate(
            template_id="characters-v1",
            name="Characters Capture Sheet",
            page_width=1200,
            page_height=2200,
            slots=_grid_slots(LOWER, "char", 180, cols=4, repetitions=3)
            + _grid_slots(UPPER, "char", 980, cols=4, repetitions=2)
            + _grid_slots(DIGITS + PUNCT, "char", 1700, cols=4, repetitions=2),
        ),
        CaptureTemplate(
            template_id="ligatures-v1",
            name="Ligatures Capture Sheet",
            page_width=1200,
            page_height=1600,
            slots=_grid_slots(LIGATURES, "ligature", 180, cols=4, repetitions=4),
        ),
        CaptureTemplate(
            template_id="words-v1",
            name="Words Capture Sheet",
            page_width=1200,
            page_height=1600,
            slots=_grid_slots(WORDS, "word", 180, cols=3, repetitions=4),
        ),
    ]
    return [template.to_dict() for template in templates]
