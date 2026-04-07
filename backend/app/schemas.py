from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class GlyphVariant(BaseModel):
    id: str
    symbol: str
    width: int
    height: int
    baseline: float = 0.0
    left_bearing: float = 0.0
    right_bearing: float = 0.0
    entry_point: Optional[List[float]] = None
    exit_point: Optional[List[float]] = None
    bitmap_path: Optional[str] = None
    svg_path: Optional[str] = None


class GlyphCollection(BaseModel):
    symbol: str
    variants: List[GlyphVariant] = Field(default_factory=list)


class HandwritingStyle(BaseModel):
    style_id: str
    name: str
    glyphs: Dict[str, List[GlyphVariant]] = Field(default_factory=dict)


class StyleSummary(BaseModel):
    style_id: str
    name: str
    glyph_count: int = 0
    variant_count: int = 0
    renderable: bool = False


class RenderRequest(BaseModel):
    style_id: str
    text: str
    randomness: float = Field(default=0.35, ge=0.0, le=1.0)
    connect_cursive: bool = True
    output: str = Field(default="svg")
    line_width: int = 900
    font_size: int = 72
    page: Optional[str] = None


class SegmentCandidate(BaseModel):
    id: str
    bbox: List[int]
    image_path: str
    suggested_label: Optional[str] = None
    confidence: Optional[float] = None


class UploadResponse(BaseModel):
    document_id: str
    preview_path: str
    segments: List[SegmentCandidate]
