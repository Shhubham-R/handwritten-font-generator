from __future__ import annotations

from typing import Dict, List
from pydantic import BaseModel, Field


class ExtractedCaptureItem(BaseModel):
    slot_key: str
    label: str
    kind: str
    image_path: str


class CaptureSheetManifest(BaseModel):
    sheet_id: str
    template_id: str
    items: List[ExtractedCaptureItem] = Field(default_factory=list)


class BuildCaptureDatasetRequest(BaseModel):
    style_name: str
    sheets: List[CaptureSheetManifest]
