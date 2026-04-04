import React, { useMemo, useState } from 'react';

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

  const inferredSequence = useMemo(() => DEFAULT_LABELS.split(''), []);

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

  return (
    <div className="app-shell">
      <header>
        <h1>Handwritten Font Generator</h1>
        <p>Upload a handwriting sheet, correct the labels, build a style, then render text with variation-aware glyph selection.</p>
      </header>

      <section className="card">
        <h2>1. Upload</h2>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={upload}>Process sheet</button>
        {uploadResult && (
          <div className="preview-block">
            <img src={`${API}${uploadResult.preview_path}`} alt="preprocessed" className="preview-image" />
            <p>{uploadResult.segments.length} candidate characters detected</p>
          </div>
        )}
      </section>

      {uploadResult && (
        <section className="card">
          <h2>2. Correct labels</h2>
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
        <h2>3. Render</h2>
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
