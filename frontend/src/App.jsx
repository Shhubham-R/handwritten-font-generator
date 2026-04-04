import React, { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:8000';
const DEFAULT_LABELS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:-()';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [styleName, setStyleName] = useState('My Handwriting');
  const [labels, setLabels] = useState({});
  const [styles, setStyles] = useState([]);
  const [renderText, setRenderText] = useState('This should look handwritten.');
  const [renderedUrl, setRenderedUrl] = useState('');
  const [randomness, setRandomness] = useState(0.45);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('characters-v1');
  const [captureFile, setCaptureFile] = useState(null);
  const [captureSheets, setCaptureSheets] = useState([]);

  const inferredSequence = useMemo(() => DEFAULT_LABELS.split(''), []);

  useEffect(() => {
    fetch(`${API}/capture/templates`).then((r) => r.json()).then(setTemplates).catch(() => {});
  }, []);

  async function upload() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await response.json();
    setUploadResult(data);
    const nextLabels = {};
    data.segments.forEach((segment, index) => {
      nextLabels[segment.image_path] = segment.suggested_label || inferredSequence[index] || '';
    });
    setLabels(nextLabels);
  }

  async function createStyle() {
    const grouped = {};
    Object.entries(labels).forEach(([path, label]) => {
      if (!label) return;
      grouped[label] ||= [];
      grouped[label].push(path);
    });

    const formData = new FormData();
    formData.append('style_name', styleName);
    formData.append('labels', JSON.stringify(grouped));
    const response = await fetch(`${API}/styles`, { method: 'POST', body: formData });
    const style = await response.json();
    setStyles((prev) => [style, ...prev]);
  }

  async function loadStyles() {
    const response = await fetch(`${API}/styles`);
    setStyles(await response.json());
  }

  async function render(styleId) {
    const response = await fetch(`${API}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style_id: styleId,
        text: renderText,
        randomness,
        connect_cursive: true,
        output: 'svg',
        page: 'ruled',
        font_size: 72,
      }),
    });
    const data = await response.json();
    setRenderedUrl(`${API}${data.url}`);
  }

  async function uploadCaptureSheet() {
    if (!captureFile || !selectedTemplate) return;
    const formData = new FormData();
    formData.append('template_id', selectedTemplate);
    formData.append('file', captureFile);
    const response = await fetch(`${API}/capture/upload`, { method: 'POST', body: formData });
    const data = await response.json();
    setCaptureSheets((prev) => [data, ...prev]);
  }

  async function buildCaptureStyle() {
    const response = await fetch(`${API}/capture/build-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style_name: styleName, sheets: captureSheets }),
    });
    const style = await response.json();
    setStyles((prev) => [style, ...prev]);
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Handwritten Font Generator</h1>
        <p>Use printable capture sheets for accurate dataset building, then render text with your handwriting assets.</p>
      </header>

      <section className="card">
        <h2>1. Capture-sheet mode (recommended)</h2>
        <div className="styles-list">
          {templates.map((template) => (
            <a key={template.template_id} href={`${API}${template.download_url}`} target="_blank" rel="noreferrer">
              <button type="button">Download {template.name}</button>
            </a>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
            {templates.map((template) => (
              <option key={template.template_id} value={template.template_id}>{template.name}</option>
            ))}
          </select>
          <input type="file" accept="image/*,.png,.jpg,.jpeg" onChange={(e) => setCaptureFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="styles-list" style={{ marginTop: 12 }}>
          <button onClick={uploadCaptureSheet}>Upload filled capture sheet</button>
          <button onClick={buildCaptureStyle} disabled={!captureSheets.length}>Build style from uploaded sheets</button>
        </div>
        {!!captureSheets.length && <p>{captureSheets.length} capture sheet(s) uploaded.</p>}
      </section>

      <section className="card">
        <h2>2. Legacy free-form OCR mode</h2>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={upload}>Process random sheet</button>
        {uploadResult && (
          <div className="preview-block">
            <img src={`${API}${uploadResult.preview_path}`} alt="preprocessed" className="preview-image" />
            <p>{uploadResult.segments.length} candidate characters detected</p>
          </div>
        )}
      </section>

      {uploadResult && (
        <section className="card">
          <h2>3. Correct legacy-mode labels</h2>
          <input value={styleName} onChange={(e) => setStyleName(e.target.value)} placeholder="Style name" />
          <div className="segments-grid">
            {uploadResult.segments.map((segment) => (
              <div key={segment.id} className="segment-card">
                <img src={`${API}${segment.image_path}`} alt={segment.id} />
                <input
                  maxLength={1}
                  value={labels[segment.image_path] || ''}
                  onChange={(e) => setLabels((prev) => ({ ...prev, [segment.image_path]: e.target.value }))}
                />
                <small>{segment.confidence ? `OCR ${(segment.confidence * 100).toFixed(0)}%` : 'No OCR guess'}</small>
              </div>
            ))}
          </div>
          <button onClick={createStyle}>Build style</button>
        </section>
      )}

      <section className="card">
        <h2>4. Render</h2>
        <div className="row">
          <button onClick={loadStyles}>Refresh styles</button>
          <input value={renderText} onChange={(e) => setRenderText(e.target.value)} placeholder="Type text to render" />
        </div>
        <label>Randomness: {randomness.toFixed(2)}</label>
        <input type="range" min="0" max="1" step="0.01" value={randomness} onChange={(e) => setRandomness(Number(e.target.value))} />
        <div className="styles-list">
          {styles.map((style) => (
            <button key={style.style_id} onClick={() => render(style.style_id)}>
              Render with {style.name}
            </button>
          ))}
        </div>
        {renderedUrl && <iframe src={renderedUrl} title="rendered handwriting" className="render-frame" />}
      </section>
    </div>
  );
}
