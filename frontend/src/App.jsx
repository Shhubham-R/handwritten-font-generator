import React, { useEffect, useMemo, useState } from 'react';

const FONT_OPTIONS = [
  {
    id: 'qebev',
    name: 'Bev',
    fontFamily: 'QEBEV',
    fontFile: 'QEBEV.ttf',
    previewImage: 'QEBev.png',
    vibe: 'soft, rounded, casual notes',
  },
  {
    id: 'qebradenhill',
    name: 'Braden Hill',
    fontFamily: 'QEBradenHill',
    fontFile: 'QEBradenHill.ttf',
    previewImage: 'QEBradenHill.png',
    vibe: 'clean, upright, neat student style',
  },
  {
    id: 'qecarolinemutiboko',
    name: 'Caroline Mutiboko',
    fontFamily: 'QECarolineMutiboko',
    fontFile: 'QECarolineMutiboko.ttf',
    previewImage: 'QECarolineMutiboko.png',
    vibe: 'elegant, slightly airy handwriting',
  },
  {
    id: 'qejer',
    name: 'JER',
    fontFamily: 'QEJER',
    fontFile: 'QEJER.ttf',
    previewImage: 'QEJER.png',
    vibe: 'quick, natural, lightly messy strokes',
  },
  {
    id: 'qejohncaplin',
    name: 'John Caplin',
    fontFamily: 'QEJohnCaplin',
    fontFile: 'QEJohnCaplin.ttf',
    previewImage: 'QEJohnCaplin.png',
    vibe: 'compact, tidy, practical handwriting',
  },
  {
    id: 'qeruthstafford',
    name: 'Ruth Stafford',
    fontFamily: 'QERuthStafford',
    fontFile: 'QERuthStafford.ttf',
    previewImage: 'QERuthStafford.png',
    vibe: 'warm, readable, personal-letter feel',
  },
];

const PAPER_TYPES = {
  plain: { backgroundClass: 'paper paper-plain', lineClass: '', description: 'Plain page' },
  ruled: { backgroundClass: 'paper paper-ruled', lineClass: '', description: 'Ruled notebook page' },
  grid: { backgroundClass: 'paper paper-grid', lineClass: '', description: 'Light grid page' },
};

const DEFAULT_TEXT = `Hey there,

This is a handwritten-style preview generated directly in the browser using fonts hosted in this GitHub repository.

You can switch writers, tune spacing and slant, and export the result as a PNG image.`;

function loadFontFace(option) {
  const face = new FontFace(option.fontFamily, `url(${import.meta.env.BASE_URL}fonts/${option.fontFile})`);
  return face.load().then((loaded) => {
    document.fonts.add(loaded);
    return loaded;
  });
}

function downloadDataUrl(dataUrl, filename) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

function wrapText(ctx, text, maxWidth, lineHeight) {
  const paragraphs = text.split('\n');
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (!paragraph.trim()) {
      lines.push('');
      return;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    words.forEach((word) => {
      const tentative = currentLine ? `${currentLine} ${word}` : word;
      const width = ctx.measureText(tentative).width;
      if (width <= maxWidth || !currentLine) {
        currentLine = tentative;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    if (paragraphIndex !== paragraphs.length - 1) lines.push('');
  });

  return {
    lines,
    height: Math.max(lineHeight * Math.max(lines.length, 1), lineHeight),
  };
}

export default function App() {
  const [selectedFontId, setSelectedFontId] = useState(FONT_OPTIONS[0].id);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [fontSize, setFontSize] = useState(56);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [letterSpacing, setLetterSpacing] = useState(0.6);
  const [wordSpacing, setWordSpacing] = useState(1);
  const [slant, setSlant] = useState(-4);
  const [inkColor, setInkColor] = useState('#1f2937');
  const [paperType, setPaperType] = useState('ruled');
  const [pageWidth, setPageWidth] = useState(900);
  const [loadedFonts, setLoadedFonts] = useState({});
  const [copied, setCopied] = useState(false);

  const selectedFont = useMemo(
    () => FONT_OPTIONS.find((option) => option.id === selectedFontId) || FONT_OPTIONS[0],
    [selectedFontId],
  );

  useEffect(() => {
    let cancelled = false;
    loadFontFace(selectedFont)
      .then(() => {
        if (!cancelled) {
          setLoadedFonts((prev) => ({ ...prev, [selectedFont.id]: true }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedFonts((prev) => ({ ...prev, [selectedFont.id]: false }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFont]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function exportPng() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const paddingX = 64;
    const paddingY = 72;
    const usableWidth = pageWidth - paddingX * 2;
    const computedLineHeight = fontSize * lineHeight;

    ctx.font = `${fontSize}px "${selectedFont.fontFamily}"`;
    const wrapped = wrapText(ctx, text, usableWidth, computedLineHeight);

    canvas.width = pageWidth;
    canvas.height = Math.max(700, Math.ceil(wrapped.height + paddingY * 2));

    ctx.fillStyle = '#fffef8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (paperType === 'ruled') {
      ctx.strokeStyle = '#dbeafe';
      ctx.lineWidth = 1;
      for (let y = paddingY - 8; y < canvas.height - paddingY + computedLineHeight; y += computedLineHeight) {
        ctx.beginPath();
        ctx.moveTo(paddingX / 2, y + computedLineHeight * 0.35);
        ctx.lineTo(canvas.width - paddingX / 2, y + computedLineHeight * 0.35);
        ctx.stroke();
      }
    }

    if (paperType === 'grid') {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let x = paddingX / 2; x < canvas.width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = paddingY / 2; y < canvas.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(paddingX, paddingY);
    ctx.transform(1, 0, Math.tan((slant * Math.PI) / 180), 1, 0, 0);
    ctx.fillStyle = inkColor;
    ctx.font = `${fontSize}px "${selectedFont.fontFamily}"`;
    ctx.textBaseline = 'top';

    wrapped.lines.forEach((line, index) => {
      const y = index * computedLineHeight;
      if (!line) return;
      let x = 0;
      for (const char of line) {
        if (char === ' ') {
          x += ctx.measureText(' ').width * wordSpacing;
          continue;
        }
        ctx.fillText(char, x, y);
        x += ctx.measureText(char).width + letterSpacing;
      }
    });

    ctx.restore();

    downloadDataUrl(canvas.toDataURL('image/png'), `${selectedFont.name.toLowerCase().replace(/\s+/g, '-')}-handwriting.png`);
  }

  async function copyShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('font', selectedFont.id);
    url.searchParams.set('text', text);
    url.searchParams.set('size', String(fontSize));
    url.searchParams.set('lh', String(lineHeight));
    url.searchParams.set('ls', String(letterSpacing));
    url.searchParams.set('ws', String(wordSpacing));
    url.searchParams.set('slant', String(slant));
    url.searchParams.set('paper', paperType);
    url.searchParams.set('ink', inkColor.replace('#', ''));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const font = params.get('font');
    const sharedText = params.get('text');
    const size = Number(params.get('size'));
    const lh = Number(params.get('lh'));
    const ls = Number(params.get('ls'));
    const ws = Number(params.get('ws'));
    const sharedSlant = Number(params.get('slant'));
    const paper = params.get('paper');
    const ink = params.get('ink');

    if (font && FONT_OPTIONS.some((option) => option.id === font)) setSelectedFontId(font);
    if (sharedText) setText(sharedText);
    if (!Number.isNaN(size) && size >= 24 && size <= 120) setFontSize(size);
    if (!Number.isNaN(lh) && lh >= 1 && lh <= 3) setLineHeight(lh);
    if (!Number.isNaN(ls) && ls >= 0 && ls <= 8) setLetterSpacing(ls);
    if (!Number.isNaN(ws) && ws >= 0.6 && ws <= 2.4) setWordSpacing(ws);
    if (!Number.isNaN(sharedSlant) && sharedSlant >= -12 && sharedSlant <= 12) setSlant(sharedSlant);
    if (paper && PAPER_TYPES[paper]) setPaperType(paper);
    if (ink && /^[0-9a-fA-F]{6}$/.test(ink)) setInkColor(`#${ink}`);
  }, []);

  return (
    <div className="app-shell">
      <header className="hero card">
        <div>
          <p className="eyebrow">GitHub Pages · static app · repo-hosted fonts</p>
          <h1>Handwritten Font Generator</h1>
          <p className="hero-copy">
            Pick a handwriting sample, type your text, tune the feel, and generate a human-looking handwritten preview directly from fonts hosted in this repository.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={exportPng}>Export PNG</button>
          <button type="button" className="secondary" onClick={copyShareLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
        </div>
      </header>

      <main className="layout">
        <aside className="card controls-panel">
          <section>
            <h2>Writer styles</h2>
            <div className="font-grid">
              {FONT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`font-card ${selectedFont.id === option.id ? 'active' : ''}`}
                  onClick={() => setSelectedFontId(option.id)}
                >
                  <img src={`${import.meta.env.BASE_URL}previews/${option.previewImage}`} alt={`${option.name} handwriting sample`} />
                  <span>{option.name}</span>
                  <small>{option.vibe}</small>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>Controls</h2>
            <label>
              Font size
              <input type="range" min="24" max="120" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              <span>{fontSize}px</span>
            </label>
            <label>
              Line spacing
              <input type="range" min="1" max="3" step="0.05" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} />
              <span>{lineHeight.toFixed(2)}</span>
            </label>
            <label>
              Letter spacing
              <input type="range" min="0" max="8" step="0.1" value={letterSpacing} onChange={(e) => setLetterSpacing(Number(e.target.value))} />
              <span>{letterSpacing.toFixed(1)}px</span>
            </label>
            <label>
              Word spacing
              <input type="range" min="0.6" max="2.4" step="0.05" value={wordSpacing} onChange={(e) => setWordSpacing(Number(e.target.value))} />
              <span>{wordSpacing.toFixed(2)}×</span>
            </label>
            <label>
              Slant
              <input type="range" min="-12" max="12" step="1" value={slant} onChange={(e) => setSlant(Number(e.target.value))} />
              <span>{slant}°</span>
            </label>
            <label>
              Ink color
              <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} />
            </label>
            <label>
              Paper style
              <select value={paperType} onChange={(e) => setPaperType(e.target.value)}>
                {Object.entries(PAPER_TYPES).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.description}</option>
                ))}
              </select>
            </label>
            <label>
              Page width
              <input type="range" min="680" max="1200" step="10" value={pageWidth} onChange={(e) => setPageWidth(Number(e.target.value))} />
              <span>{pageWidth}px</span>
            </label>
          </section>
        </aside>

        <section className="card preview-panel">
          <div className="preview-header">
            <div>
              <h2>Live generator</h2>
              <p>
                Currently using <strong>{selectedFont.name}</strong> · {selectedFont.vibe}
                {!loadedFonts[selectedFont.id] ? ' · loading font…' : ''}
              </p>
            </div>
          </div>

          <label className="text-editor-label">
            Text
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Type what you want to render" />
          </label>

          <div className={PAPER_TYPES[paperType].backgroundClass} style={{ maxWidth: `${pageWidth}px` }}>
            <div
              className="handwriting-preview"
              style={{
                fontFamily: `"${selectedFont.fontFamily}", cursive`,
                fontSize: `${fontSize}px`,
                lineHeight,
                letterSpacing: `${letterSpacing}px`,
                wordSpacing: `${wordSpacing}rem`,
                color: inkColor,
                transform: `skewX(${slant}deg)`,
              }}
            >
              {text}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
