from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class WordItem(BaseModel):
    line_index: int
    word_index: int
    image_path: str
    bbox: List[int]
    predicted_text: Optional[str] = None
    confidence: Optional[float] = None


class LineItem(BaseModel):
    line_index: int
    image_path: str
    bbox: List[int]
    predicted_text: Optional[str] = None
    confidence: Optional[float] = None
    words: List[WordItem] = Field(default_factory=list)


class FreeformManifest(BaseModel):
    page_id: str
    source_image: str
    preprocessed_image: str
    lines: List[LineItem] = Field(default_factory=list)
    words: List[WordItem] = Field(default_factory=list)
