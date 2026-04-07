from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Dict, List

import cv2
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .capture_schemas import BuildCaptureDatasetRequest
from .capture_sheet import CaptureSheetService
from .dataset import VariationGenerator
from .freeform import FreeformPageService
from .freeform_schemas import BuildFreeformStyleRequest
from .preprocess import HandwritingPreprocessor
from .rendering import HandwritingRenderer
from .schemas import RenderRequest, UploadResponse
from .segmentation import CharacterSegmenter
from .storage import DATA_DIR, SEGMENTS_DIR, STYLES_DIR, UPLOADS_DIR

app = FastAPI(title="Handwritten Font Generator API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

preprocessor = HandwritingPreprocessor()
segmenter = CharacterSegmenter()
dataset_builder = VariationGenerator()
renderer = HandwritingRenderer()
capture_sheet_service = CaptureSheetService()
freeform_page_service = FreeformPageService()

app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/upload", response_model=UploadResponse)
async def upload_handwriting(file: UploadFile = File(...)):
    document_id = str(uuid.uuid4())[:10]
    upload_path = UPLOADS_DIR / f"{document_id}_{file.filename}"
    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    processed = preprocessor.run(upload_path)
    preview_path = UPLOADS_DIR / f"{document_id}_preview.png"
    cv2.imwrite(str(preview_path), processed.clean)
    segments = segmenter.segment(processed.clean, SEGMENTS_DIR / document_id)
    return UploadResponse(document_id=document_id, preview_path=f"/data/uploads/{preview_path.name}", segments=segments)


@app.post("/styles")
async def create_style(style_name: str = Form(...), labels: str = Form(...)):
    import json

    parsed = json.loads(labels)
    style = dataset_builder.build_style(style_name, parsed)
    return style


@app.get("/styles")
def list_styles():
    styles: List[Dict] = []
    for style_json in STYLES_DIR.glob("*/style.json"):
        import json
        styles.append(json.loads(style_json.read_text(encoding="utf-8")))
    return styles


@app.get("/capture/templates")
def list_capture_templates():
    templates = capture_sheet_service.list_templates()
    for template in templates:
        capture_sheet_service.render_template_svg(template['template_id'])
    return [
        {
            **template,
            'download_url': f"/data/templates/{template['template_id']}.svg",
        }
        for template in templates
    ]


@app.post("/capture/upload")
async def upload_capture_sheet(template_id: str = Form(...), file: UploadFile = File(...)):
    upload_id = str(uuid.uuid4())[:10]
    upload_path = UPLOADS_DIR / f"capture_{upload_id}_{file.filename}"
    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return capture_sheet_service.extract_from_sheet(template_id, upload_path)


@app.post("/capture/build-style")
def build_capture_style(request: BuildCaptureDatasetRequest):
    items = []
    for sheet in request.sheets:
        items.extend(item.model_dump() for item in sheet.items)
    return dataset_builder.build_style_from_capture_items(request.style_name, items)


@app.post("/freeform/upload")
async def upload_freeform_page(file: UploadFile = File(...)):
    upload_id = str(uuid.uuid4())[:10]
    upload_path = UPLOADS_DIR / f"freeform_{upload_id}_{file.filename}"
    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return freeform_page_service.process_page(upload_path)


@app.post("/freeform/build-style")
def build_freeform_style(request: BuildFreeformStyleRequest):
    return dataset_builder.build_style_from_freeform_words(request.style_name, [page.model_dump() for page in request.pages])


@app.post("/render")
def render_text(request: RenderRequest):
    try:
        output_id, output_path = renderer.render_svg(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"render_id": output_id, "path": output_path, "url": f"/data/outputs/{Path(output_path).name}"}
