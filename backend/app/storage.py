from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
SEGMENTS_DIR = DATA_DIR / "segments"
STYLES_DIR = DATA_DIR / "styles"
OUTPUTS_DIR = DATA_DIR / "outputs"

for directory in [DATA_DIR, UPLOADS_DIR, SEGMENTS_DIR, STYLES_DIR, OUTPUTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
