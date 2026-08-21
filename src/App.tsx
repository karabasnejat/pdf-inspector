import { useState, useRef, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import { usePdfInspector } from './usePdfInspector';
import { useAnydoc } from './useAnydoc';
import { anydocBenchmark } from './data/anydocBenchmarkData';
import type { PdfProcessResult } from '@firecrawl/pdf-inspector-wasm';
import type { Format } from '@firecrawl/anydoc-wasm';

function toRawText(markdown: string) {
  return markdown.replace(/[#*_`\[\]()>|-]/g, '');
}

type DocumentResult = {
  markdown: string;
  format?: Format;
  pdf?: PdfProcessResult;
  processingTimeMs: number;
};

const supportedExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.docm',
  '.ppt',
  '.pps',
  '.pot',
  '.pptx',
  '.pptm',
  '.ppsx',
  '.ppsm',
  '.xls',
  '.xlsx',
  '.xlsm',
  '.xlsb',
  '.odt',
  '.ods',
  '.odp',
  '.rtf',
  '.epub',
  '.csv',
];

const formatGroups = [
  { label: 'PDF', formats: ['.pdf'] },
  { label: 'Word', formats: ['.doc', '.docx', '.docm'] },
  { label: 'PowerPoint', formats: ['.ppt', '.pptx', '.pps', '.ppsx', '.pot'] },
  { label: 'Excel', formats: ['.xls', '.xlsx', '.xlsm', '.xlsb'] },
  { label: 'OpenDocument', formats: ['.odt', '.ods', '.odp'] },
  { label: 'Other', formats: ['.rtf', '.epub', '.csv'] },
];

const pdfBenchmarkRows = [
  { engine: 'pdf-inspector', overall: '0.875', readingOrder: '0.915', tables: '0.814', headings: '0.788', completeRun: '2.8s', highlight: true },
  { engine: 'LiteParse', overall: '0.870', readingOrder: '0.908', tables: '0.693', headings: '0.811', completeRun: '13.9s' },
  { engine: 'OpenDataLoader', overall: '0.843', readingOrder: '0.912', tables: '0.489', headings: '0.760', completeRun: '9.8s' },
  { engine: 'PyMuPDF4LLM', overall: '0.735', readingOrder: '0.886', tables: '0.401', headings: '0.424', completeRun: '15.5s' },
  { engine: 'MarkItDown', overall: '0.583', readingOrder: '0.879', tables: '0.000', headings: '0.000', completeRun: '6.7s' },
];

function isSupportedFile(fileName: string) {
  const lowerName = fileName.toLowerCase();
  return supportedExtensions.some((extension) => lowerName.endsWith(extension));
}

function getFileKindLabel(format?: Format, fileName?: string | null) {
  if (format) return format.toUpperCase();
  if (!fileName) return 'Document';
  const extension = fileName.split('.').pop();
  return extension ? extension.toUpperCase() : 'Document';
}

function getConvertErrorMessage(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    const code = (error as Error & { code?: string }).code;
    if (code === 'encrypted') return 'Bu dosya şifreli veya parola korumalı.';
    if (code === 'unsupported') return 'Bu dosyadan anlamlı Markdown çıkarılamadı. Görsel tabanlı PDF için OCR gerekebilir.';
    if (code === 'malformed') return 'Dosya yapısı okunabilir içerik çıkarmak için uygun değil.';
    if (code === 'resourceLimit') return 'Dosya güvenlik limitlerini aştığı için dönüştürülemedi.';
    if (code === 'missingPart') return 'Dosyada dönüşüm için gerekli bir bölüm eksik.';
  }

  return error instanceof Error ? error.message : 'Dosya işlenirken bir hata oluştu.';
}

function formatMs(value: number | null) {
  return value == null ? '-' : `${value.toFixed(2)} ms`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatBenchmarkDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function App() {
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'markdown' | 'raw'>('markdown');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { ready, processPdf } = usePdfInspector();
  const { convertToMarkdown, detectFormat } = useAnydoc();

  const handleFile = useCallback(async (file: File) => {
    if (!isSupportedFile(file.name)) {
      setError('Lütfen desteklenen bir doküman seçin: PDF, Word, PowerPoint, Excel, OpenDocument, RTF, EPUB veya CSV.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSuccessMessage(null);
    setFileName(file.name);

    try {
      const startedAt = performance.now();
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const isPdf = file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        const pdf = await processPdf(data);
        setResult({
          markdown: pdf.markdown ?? '',
          format: 'pdf',
          pdf,
          processingTimeMs: performance.now() - startedAt,
        });
        setSuccessMessage(`Extraction completed for ${file.name}. Your result is ready below.`);
        return;
      }

      const [markdown, format] = await Promise.all([
        convertToMarkdown(data, file.name),
        detectFormat(data, file.name),
      ]);

      setResult({
        markdown,
        format,
        processingTimeMs: performance.now() - startedAt,
      });
      setSuccessMessage(`Extraction completed for ${file.name}. Your result is ready below.`);
    } catch (e) {
      setError(getConvertErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [convertToMarkdown, detectFormat, processPdf]);

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
    const baseName = (fileName ?? 'document-output').replace(/\.[^.]+$/i, '');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-${activeTab}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTab, fileName, result]);

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
          <span className="badge-rust">ANYDOC + PDF INSPECTOR</span>
        </div>
        <h1>Document Inspector</h1>
        <p className="header-desc">
          Convert mixed document files into clean GitHub-Flavored Markdown with Anydoc, while
          keeping pdf-inspector's PDF classification, OCR hints, and layout details for PDF uploads.
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
        <h2>Upload a document</h2>
        <p>Drag and drop or click to select</p>
        <div className="format-support" aria-label="Supported formats">
          {formatGroups.map((group) => (
            <span className="format-chip" key={group.label}>
              <span className="format-chip-label">{group.label}</span>
              <span className="format-chip-values">{group.formats.join(' ')}</span>
            </span>
          ))}
        </div>
        {!ready && <p className="wasm-loading">Loading PDF Inspector...</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept={supportedExtensions.join(',')}
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
              <span className="terminal-cmd">npm i @firecrawl/anydoc-wasm</span>
            </div>
            <div className="terminal-output">  installed the browser converter</div>
            <br />
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd">toMarkdownBytes(report.docx)</span>
            </div>
            <div className="terminal-output terminal-md"># Annual Report 2025</div>
            <br />
            <div className="terminal-output terminal-md">## Financial highlights</div>
            <div className="terminal-output terminal-md">| Metric | 2025 | 2024 |</div>
            <div className="terminal-output terminal-md">|---|---:|---:|</div>
            <br />
            <div className="terminal-meta">
              <div className="terminal-meta-row"><span className="terminal-meta-label">formats</span><span className="terminal-meta-value highlight">PDF / DOCX / XLSX / PPTX</span></div>
              <div className="terminal-meta-row"><span className="terminal-meta-label">output</span><span className="terminal-meta-value">GitHub-Flavored Markdown</span></div>
              <div className="terminal-meta-row"><span className="terminal-meta-label">engine</span><span className="terminal-meta-value">Rust</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="benchmark-stack">
        <div className="benchmark-section">
          <div className="benchmark-header">
            <span className="benchmark-tag">PDF Inspector benchmark · 200 PDFs</span>
            <span className="benchmark-meta">OpenDataLoader benchmark · Apple M4 Pro · median of 3 runs</span>
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
                {pdfBenchmarkRows.map((row) => (
                  <tr className={row.highlight ? 'benchmark-highlight' : ''} key={row.engine}>
                    <td><span className="benchmark-dot" />{row.engine}</td>
                    <td>{row.overall}</td>
                    <td>{row.readingOrder}</td>
                    <td>{row.tables}</td>
                    <td>{row.headings}</td>
                    <td>{row.completeRun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="benchmark-footer">
            Refreshed July 16, 2026. Scores use the benchmark's NID, TEDS, and MHS evaluators.
          </p>
        </div>

        <div className="benchmark-section">
          <div className="benchmark-header">
            <span className="benchmark-tag">
              Anydoc mixed-document benchmark · {anydocBenchmark.totalFiles} files
            </span>
            <span className="benchmark-meta">
              {anydocBenchmark.runsPerFile} runs per file · refreshed {formatBenchmarkDate(anydocBenchmark.generatedAt)}
            </span>
          </div>
          <div className="benchmark-summary-grid">
            <div className="benchmark-summary-card">
              <span className="benchmark-summary-label">Success</span>
              <span className="benchmark-summary-value">
                {anydocBenchmark.successfulFiles}/{anydocBenchmark.totalFiles}
              </span>
            </div>
            <div className="benchmark-summary-card">
              <span className="benchmark-summary-label">Median conversion</span>
              <span className="benchmark-summary-value">{formatMs(anydocBenchmark.medianMs)}</span>
            </div>
            <div className="benchmark-summary-card">
              <span className="benchmark-summary-label">Markdown output</span>
              <span className="benchmark-summary-value">{anydocBenchmark.totalMarkdownChars.toLocaleString()} chars</span>
            </div>
          </div>
          <div className="benchmark-table-wrap">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Files</th>
                  <th>Success</th>
                  <th>Median</th>
                  <th>Input</th>
                  <th>Markdown</th>
                </tr>
              </thead>
              <tbody>
                {anydocBenchmark.byFormat.map((row) => (
                  <tr className={row.successRate === 1 ? 'benchmark-highlight' : ''} key={row.format}>
                    <td><span className="benchmark-dot" />{row.format}</td>
                    <td>{row.files}</td>
                    <td>{row.success}/{row.files} · {formatPercent(row.successRate)}</td>
                    <td>{formatMs(row.medianMs)}</td>
                    <td>{row.totalBytes.toLocaleString()} B</td>
                    <td>{row.totalMarkdownChars.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="benchmark-footer">
            Corpus: Unstructured example-docs, Apache Tika test documents, and Apache POI signed Office fixtures.
            Generated locally with the browser WASM package.
          </p>
        </div>
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
            <h3>Doküman</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Format</span>
                <span className="badge text-based">
                  {getFileKindLabel(result.format, fileName)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Dönüştürücü</span>
                <span className="info-value">{result.pdf ? 'PDF Inspector WASM' : 'Anydoc WASM'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Dosya</span>
                <span className="info-value">{fileName}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>{result.pdf ? 'PDF Detayları' : 'Detaylar'}</h3>
            <div className="info-grid">
              {result.pdf && (
                <>
                  <div className="info-item">
                    <span className="info-label">PDF Türü</span>
                    <span className={`badge ${getBadgeClass(result.pdf.pdfType)}`}>
                      {getTypeLabel(result.pdf.pdfType)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Güven Skoru</span>
                    <span className="info-value">{(result.pdf.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${result.pdf.confidence * 100}%` }} />
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Sayfa Sayısı</span>
                    <span className="info-value">{result.pdf.pageCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">OCR Gereken Sayfalar</span>
                    <span className="info-value">
                      {result.pdf.pagesNeedingOcr.length === 0
                        ? 'Yok'
                        : result.pdf.pagesNeedingOcr.join(', ')}
                    </span>
                  </div>
                </>
              )}
              <div className="info-item">
                <span className="info-label">İşlem Süresi</span>
                <span className="info-value">{result.processingTimeMs.toFixed(0)} ms</span>
              </div>
              {result.pdf && (
                <>
                  <div className="info-item">
                    <span className="info-label">Tablo İçeren Sayfalar</span>
                    <span className="info-value">
                      {result.pdf.layout.pagesWithTables.length === 0
                        ? 'Yok'
                        : result.pdf.layout.pagesWithTables.join(', ')}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Encoding Sorunları</span>
                    <span className="info-value">{result.pdf.hasEncodingIssues ? 'Var' : 'Yok'}</span>
                  </div>
                </>
              )}
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
