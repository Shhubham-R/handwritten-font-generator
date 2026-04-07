import React, { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8001`;
const DEFAULT_LABELS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:-()';

function countAvailableGlyphs(style) {
  return Object.values(style?.glyphs || {}).filter((variants) => Array.isArray(variants) && variants.length > 0).length;
}

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
  const [freeformFile, setFreeformFile] = useState(null);
  const [freeformResult, setFreeformResult] = useState(null);
  const [renderError, setRenderError] = useState('');
  const [stylesError, setStylesError] = useState('');
  const [busy, setBusy] = useState({
    styles: false,
    render: '',
    upload: false,
    createStyle: false,
    captureUpload: false,
    captureBuild: false,
    freeform: false,
    freeformBuild: false,
  });

  const inferredSequence = useMemo(() => DEFAULT_LABELS.split(''), []);
  const renderableStyles = useMemo(() => styles.filter((style) => countAvailableGlyphs(style) > 0), [styles]);

  useEffect(() => {
    fetch(`${API}/capture/templates`).then((r) => r.json()).then(setTemplates).catch(() => {});
    loadStyles();
  }, []);

  async function upload() {
    if (!file) return;
    setBusy((prev) => ({ ...prev, upload: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to process uploaded sheet');
      const data = await response.json();
      setUploadResult(data);
      const nextLabels = {};
      data.segments.forEach((segment, index) => {
        nextLabels[segment.image_path] = segment.suggested_label || inferredSequence[index] || '';
      });
      setLabels(nextLabels);
    } finally {
      setBusy((prev) => ({ ...prev, upload: false }));
    }
  }

  async function createStyle() {
    setBusy((prev) => ({ ...prev, createStyle: true }));
    try {
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
      if (!response.ok) throw new Error('Failed to build style');
      const style = await response.json();
      setStyles((prev) => [style, ...prev]);
    } finally {
      setBusy((prev) => ({ ...prev, createStyle: false }));
    }
  }

  async function loadStyles() {
    setBusy((prev) => ({ ...prev, styles: true }));
    setStylesError('');
    try {
      const response = await fetch(`${API}/styles`);
      if (!response.ok) throw new Error(`Failed to load styles (${response.status})`);
      const loadedStyles = await response.json();
      setStyles(loadedStyles);
      if (!loadedStyles.length) {
        setStylesError('No styles found yet. Build one first.');
      }
    } catch (error) {
      setStyles([]);
      setStylesError(error.message || 'Could not load styles.');
    } finally {
      setBusy((prev) => ({ ...prev, styles: false }));
    }
  }

  async function render(styleId) {
    setBusy((prev) => ({ ...prev, render: styleId }));
    setRenderError('');
    setRenderedUrl('');
    try {
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
      if (!response.ok) {
        throw new Error(data?.detail || 'Render failed');
      }
      if (!data.url) {
        throw new Error('Render completed but no output URL was returned');
      }
      setRenderedUrl(`${API}${data.url}`);
    } catch (error) {
      setRenderError(error.message || 'Render failed');
    } finally {
      setBusy((prev) => ({ ...prev, render: '' }));
    }
  }

  async function uploadCaptureSheet() {
    if (!captureFile || !selectedTemplate) return;
    setBusy((prev) => ({ ...prev, captureUpload: true }));
    try {
      const formData = new FormData();
      formData.append('template_id', selectedTemplate);
      formData.append('file', captureFile);
      const response = await fetch(`${API}/capture/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to upload capture sheet');
      const data = await response.json();
      setCaptureSheets((prev) => [data, ...prev]);
    } finally {
      setBusy((prev) => ({ ...prev, captureUpload: false }));
    }
  }

  async function buildCaptureStyle() {
    setBusy((prev) => ({ ...prev, captureBuild: true }));
    try {
      const response = await fetch(`${API}/capture/build-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style_name: styleName, sheets: captureSheets }),
      });
      if (!response.ok) throw new Error('Failed to build style from capture sheets');
      const style = await response.json();
      setStyles((prev) => [style, ...prev]);
    } finally {
      setBusy((prev) => ({ ...prev, captureBuild: false }));
    }
  }

  async function uploadFreeformPage() {
    if (!freeformFile) return;
    setBusy((prev) => ({ ...prev, freeform: true }));
    try {
      const formData = new FormData();
      formData.append('file', freeformFile);
      const response = await fetch(`${API}/freeform/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to analyze freeform page');
      const data = await response.json();
      const words = (data.words || []).map((word) => ({ ...word, corrected_text: word.corrected_text || word.predicted_text || '' }));
      setFreeformResult({ ...data, words });
    } finally {
      setBusy((prev) => ({ ...prev, freeform: false }));
    }
  }

  async function buildFreeformStyle() {
    if (!freeformResult?.words?.length) return;
    setBusy((prev) => ({ ...prev, freeformBuild: true }));
    try {
      const response = await fetch(`${API}/freeform/build-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style_name: styleName, pages: [freeformResult] }),
      });
      if (!response.ok) throw new Error('Failed to build style from freeform analysis');
      const style = await response.json();
      setStyles((prev) => [style, ...prev]);
      setRenderedUrl('');
      setRenderError('');
    } finally {
      setBusy((prev) => ({ ...prev, freeformBuild: false }));
    }
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
            <a key={template.template_id} href={`${API}${template.download_url}`} target="_blank" rel="noreferrer" className="button-link">
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
          <button onClick={uploadCaptureSheet} disabled={!captureFile || busy.captureUpload}>
            {busy.captureUpload ? 'Uploading…' : 'Upload filled capture sheet'}
          </button>
          <button onClick={buildCaptureStyle} disabled={!captureSheets.length || busy.captureBuild}>
            {busy.captureBuild ? 'Building…' : 'Build style from uploaded sheets'}
          </button>
        </div>
        {!!captureSheets.length && <p>{captureSheets.length} capture sheet(s) uploaded.</p>}
      </section>

      <section className="card">
        <h2>2. Freeform notebook-page analysis</h2>
        <input type="file" accept="image/*" onChange={(e) => setFreeformFile(e.target.files?.[0] ?? null)} />
        <div className="styles-list" style={{ marginTop: 12 }}>
          <button onClick={uploadFreeformPage} disabled={!freeformFile || busy.freeform}>
            {busy.freeform ? 'Analyzing…' : 'Analyze page into lines and words'}
          </button>
        </div>
        {freeformResult && (
          <div className="preview-block">
            <img src={`${API}${freeformResult.preprocessed_image}`} alt="freeform preprocessed" className="preview-image" />
            <p>{freeformResult.lines.length} lines, {freeformResult.words.length} word crops detected</p>
            <p className="status-message">To turn this into a renderable handwriting style, correct single-letter detections below and build the style.</p>
            <div className="segments-grid">
              {freeformResult.words.slice(0, 24).map((word, idx) => (
                <div key={`${word.line_index}-${word.word_index}-${idx}`} className="segment-card">
                  <img src={`${API}${word.image_path}`} alt={word.predicted_text || 'word'} />
                  <input
                    maxLength={1}
                    value={word.corrected_text || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFreeformResult((prev) => ({
                        ...prev,
                        words: prev.words.map((item, itemIdx) => itemIdx === idx ? { ...item, corrected_text: value } : item),
                      }));
                    }}
                  />
                  <strong>{word.predicted_text || '—'}</strong>
                  <small>{word.confidence ? `OCR ${(word.confidence * 100).toFixed(0)}%` : 'No OCR guess'}</small>
                </div>
              ))}
            </div>
            <div className="styles-list" style={{ marginTop: 12 }}>
              <button onClick={buildFreeformStyle} disabled={busy.freeformBuild}>
                {busy.freeformBuild ? 'Building…' : 'Build style from freeform analysis'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>3. Legacy single-character OCR mode</h2>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={upload} disabled={!file || busy.upload}>{busy.upload ? 'Processing…' : 'Process random sheet'}</button>
        {uploadResult && (
          <div className="preview-block">
            <img src={`${API}${uploadResult.preview_path}`} alt="preprocessed" className="preview-image" />
            <p>{uploadResult.segments.length} candidate characters detected</p>
          </div>
        )}
      </section>

      {uploadResult && (
        <section className="card">
          <h2>4. Correct legacy-mode labels</h2>
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
          <button onClick={createStyle} disabled={busy.createStyle}>{busy.createStyle ? 'Building…' : 'Build style'}</button>
        </section>
      )}

      <section className="card">
        <h2>5. Render</h2>
        <div className="row render-controls">
          <button onClick={loadStyles} disabled={busy.styles}>{busy.styles ? 'Refreshing…' : 'Refresh styles'}</button>
          <input value={renderText} onChange={(e) => setRenderText(e.target.value)} placeholder="Type text to render" />
        </div>
        {stylesError && <p className="status-message error">{stylesError}</p>}
        {!stylesError && !renderableStyles.length && <p className="status-message">No renderable styles yet. Build a style first, then render.</p>}
        {!!renderableStyles.length && <p className="status-message">{renderableStyles.length} renderable style(s) ready.</p>}
        <label>Randomness: {randomness.toFixed(2)}</label>
        <input type="range" min="0" max="1" step="0.01" value={randomness} onChange={(e) => setRandomness(Number(e.target.value))} />
        <div className="styles-list">
          {renderableStyles.map((style) => (
            <button key={style.style_id} onClick={() => render(style.style_id)} disabled={busy.render === style.style_id || !renderText.trim()}>
              {busy.render === style.style_id ? 'Rendering…' : `Render with ${style.name} (${countAvailableGlyphs(style)} glyphs)`}
            </button>
          ))}
        </div>
        {renderError && <p className="status-message error">{renderError}</p>}
        {renderedUrl && <iframe src={renderedUrl} title="rendered handwriting" className="render-frame" />}
      </section>
    </div>
  );
}
