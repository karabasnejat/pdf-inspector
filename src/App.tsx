import { useState, useRef, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import { usePdfInspector } from './usePdfInspector';
import type { PdfProcessResult } from '@firecrawl/pdf-inspector-wasm';

function toRawText(markdown: string) {
  return markdown.replace(/[#*_`\[\]()>|-]/g, '');
}

export default function App() {
  const [result, setResult] = useState<PdfProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'markdown' | 'raw'>('markdown');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractedContentRef = useRef<HTMLDivElement>(null);

  const { ready, processPdf } = usePdfInspector();

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Lütfen bir PDF dosyası seçin.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSuccessMessage(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const res = await processPdf(data);
      setResult(res);
      setSuccessMessage(`Extraction completed for ${file.name}. Scroll down to see the result.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF işlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [processPdf]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'TextBased': return 'text-based';
      case 'Scanned': return 'scanned';
      case 'ImageBased': return 'image-based';
      case 'Mixed': return 'mixed';
      default: return '';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'TextBased': return 'Metin Tabanlı';
      case 'Scanned': return 'Taranmış';
      case 'ImageBased': return 'Görsel Tabanlı';
      case 'Mixed': return 'Karma';
      default: return type;
    }
  };

  const handleCopy = useCallback(async () => {
    if (!result?.markdown) return;

    const content = activeTab === 'markdown' ? result.markdown : toRawText(result.markdown);
    await navigator.clipboard.writeText(content);
    setCopyFeedback(activeTab === 'markdown' ? 'Markdown copied' : 'Raw text copied');
    window.setTimeout(() => setCopyFeedback(null), 1800);
  }, [activeTab, result]);

  const handleDownload = useCallback(() => {
    if (!result?.markdown) return;

    const content = activeTab === 'markdown' ? result.markdown : toRawText(result.markdown);
    const extension = activeTab === 'markdown' ? 'md' : 'txt';
    const baseName = (fileName ?? 'pdf-output').replace(/\.pdf$/i, '');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-${activeTab}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTab, fileName, result]);

  useEffect(() => {
    if (!result?.markdown) return;

    if (window.matchMedia('(max-width: 768px)').matches) {
      return;
    }

    const target = extractedContentRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const alreadyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (alreadyVisible) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [result]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-badges">
          <span className="badge-open-source"><span className="badge-dot" />FIRECRAWL OPEN SOURCE · MIT</span>
          <span className="badge-rust">Rs RUST CORE</span>
        </div>
        <h1>PDF Inspector</h1>
        <p className="header-desc">
          A Rust-powered, open-source parser that classifies PDFs and turns native text into clean,
          position-aware Markdown. Use it from Node.js or the bundled CLI, with packages also available
          from PyPI and crates.io.
        </p>
        <div className="header-actions">
          <a href="#upload" className="btn-primary" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}>
            Try it locally <span className="arrow">↓</span>
          </a>
        </div>
      </header>

      <div className="hero-split">
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="upload-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h2>Upload a PDF</h2>
        <p>Drag and drop or click to select</p>
        {!ready && <p className="wasm-loading">Loading WASM module...</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleInputChange}
        />
        </div>

        <div className="terminal-mockup">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span /><span /><span />
            </div>
            <span className="terminal-title">npm CLI · local</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd">npm i -g @firecrawl/pdf-inspector</span>
            </div>
            <div className="terminal-output">  installed the native package + CLI</div>
            <br />
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd">pdf-inspector annual-report.pdf</span>
            </div>
            <div className="terminal-output terminal-md"># Annual Report 2025</div>
            <br />
            <div className="terminal-output terminal-md">## Financial highlights</div>
            <div className="terminal-output terminal-md">| Metric | 2025 | 2024 |</div>
            <div className="terminal-output terminal-md">|---|---:|---:|</div>
            <br />
            <div className="terminal-meta">
              <div className="terminal-meta-row"><span className="terminal-meta-label">document type</span><span className="terminal-meta-value highlight">TextBased</span></div>
              <div className="terminal-meta-row"><span className="terminal-meta-label">output</span><span className="terminal-meta-value">structured Markdown</span></div>
              <div className="terminal-meta-row"><span className="terminal-meta-label">engine</span><span className="terminal-meta-value">Rust</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="benchmark-section">
        <div className="benchmark-header">
          <span className="benchmark-tag">200 PDFs · OpenDataLoader benchmark</span>
          <span className="benchmark-meta">Apple M4 Pro · median of 3 runs</span>
        </div>
        <div className="benchmark-table-wrap">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Engine</th>
                <th>Overall</th>
                <th>Reading Order</th>
                <th>Tables</th>
                <th>Headings</th>
                <th>Complete Run</th>
              </tr>
            </thead>
            <tbody>
              <tr className="benchmark-highlight">
                <td><span className="benchmark-dot" />pdf-inspector</td>
                <td>0.875</td>
                <td>0.915</td>
                <td>0.814</td>
                <td>0.788</td>
                <td>2.8s</td>
              </tr>
              <tr>
                <td>LiteParse</td>
                <td>0.870</td>
                <td>0.908</td>
                <td>0.693</td>
                <td>0.811</td>
                <td>13.9s</td>
              </tr>
              <tr>
                <td>OpenDataLoader</td>
                <td>0.843</td>
                <td>0.912</td>
                <td>0.489</td>
                <td>0.760</td>
                <td>9.8s</td>
              </tr>
              <tr>
                <td>PyMuPDF4LLM</td>
                <td>0.735</td>
                <td>0.886</td>
                <td>0.401</td>
                <td>0.424</td>
                <td>15.5s</td>
              </tr>
              <tr>
                <td>MarkItDown</td>
                <td>0.583</td>
                <td>0.879</td>
                <td>0.000</td>
                <td>0.000</td>
                <td>6.7s</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="benchmark-footer">Refreshed July 16, 2026. Scores use the benchmark's NID, TEDS, and MHS evaluators.</p>
      </div>

      {loading && (
        <div className="status loading">
          <div className="processing-animation">
            <div className="spinner" />
            <span>{fileName} işleniyor<span className="processing-dots"><span>.</span><span>.</span><span>.</span></span></span>
          </div>
        </div>
      )}

      {error && (
        <div className="status error">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="toast-success" role="status" aria-live="polite">
          <span className="toast-success-dot" />
          <span>{successMessage}</span>
        </div>
      )}

      {result && (
        <div className="results">
          <div className="card">
            <h3>Sınıflandırma</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">PDF Türü</span>
                <span className={`badge ${getBadgeClass(result.pdfType)}`}>
                  {getTypeLabel(result.pdfType)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Güven Skoru</span>
                <span className="info-value">{(result.confidence * 100).toFixed(1)}%</span>
              </div>
              <div>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${result.confidence * 100}%` }} />
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">Dosya</span>
                <span className="info-value">{fileName}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Detaylar</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Sayfa Sayısı</span>
                <span className="info-value">{result.pageCount}</span>
              </div>
              <div className="info-item">
                <span className="info-label">OCR Gereken Sayfalar</span>
                <span className="info-value">
                  {result.pagesNeedingOcr.length === 0
                    ? 'Yok'
                    : result.pagesNeedingOcr.join(', ')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">İşlem Süresi</span>
                <span className="info-value">{result.processingTimeMs.toFixed(0)} ms</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tablo İçeren Sayfalar</span>
                <span className="info-value">
                  {result.layout.pagesWithTables.length === 0
                    ? 'Yok'
                    : result.layout.pagesWithTables.join(', ')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Encoding Sorunları</span>
                <span className="info-value">{result.hasEncodingIssues ? 'Var' : 'Yok'}</span>
              </div>
            </div>
          </div>

          {result.markdown && (
            <div className="card markdown-output">
              <h3>Çıkarılan İçerik</h3>
              <div className="content-toolbar">
                <div className="tabs">
                  <button
                    className={`tab ${activeTab === 'markdown' ? 'active' : ''}`}
                    onClick={() => setActiveTab('markdown')}
                  >
                    Markdown
                  </button>
                  <button
                    className={`tab ${activeTab === 'raw' ? 'active' : ''}`}
                    onClick={() => setActiveTab('raw')}
                  >
                    Ham Metin
                  </button>
                </div>
                <div className="content-actions">
                  <button className="action-button" onClick={() => void handleCopy()}>
                    {copyFeedback ?? (activeTab === 'markdown' ? 'Copy Markdown' : 'Copy Raw')}
                  </button>
                  <button className="action-button" onClick={handleDownload}>
                    {activeTab === 'markdown' ? 'Download .md' : 'Download .txt'}
                  </button>
                </div>
              </div>
              <div className="markdown-content">
                {activeTab === 'markdown'
                  ? <div dangerouslySetInnerHTML={{ __html: marked.parse(result.markdown) as string }} />
                  : <pre>{toRawText(result.markdown)}</pre>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
