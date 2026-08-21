import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import init, { initSync, toMarkdownBytes, formatFromBytes, formatFromPath } from '@firecrawl/anydoc-wasm';

void init;

const root = fileURLToPath(new URL('../../../', import.meta.url));
const manifestPath = join(root, 'benchmarks/anydoc/manifest.json');
const corpusDir = join(root, 'benchmarks/anydoc/corpus');
const reportsDir = join(root, 'benchmarks/anydoc/reports');
const appDataPath = join(root, 'src/data/anydocBenchmarkData.ts');
const wasmPath = join(root, 'node_modules/@firecrawl/anydoc-wasm/anydoc_wasm_bg.wasm');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const wasmBytes = await readFile(wasmPath);
initSync({ module: wasmBytes });

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function countTables(markdown) {
  return markdown.split('\n').filter((line) => /^\|.+\|$/.test(line.trim())).length;
}

function countHeadings(markdown) {
  return markdown.split('\n').filter((line) => /^#{1,6}\s+\S/.test(line)).length;
}

function summarizeByFormat(results) {
  return Object.values(results.reduce((acc, result) => {
    acc[result.format] ??= {
      format: result.format,
      files: 0,
      success: 0,
      medianMsValues: [],
      totalBytes: 0,
      totalMarkdownChars: 0,
    };

    acc[result.format].files += 1;
    acc[result.format].success += result.ok ? 1 : 0;
    acc[result.format].totalBytes += result.bytes;
    acc[result.format].totalMarkdownChars += result.markdownChars;
    if (result.ok) acc[result.format].medianMsValues.push(result.medianMs);
    return acc;
  }, {})).map((entry) => ({
    format: entry.format.toUpperCase(),
    files: entry.files,
    success: entry.success,
    successRate: entry.files === 0 ? 0 : entry.success / entry.files,
    medianMs: entry.medianMsValues.length === 0 ? null : median(entry.medianMsValues),
    totalBytes: entry.totalBytes,
    totalMarkdownChars: entry.totalMarkdownChars,
  })).sort((a, b) => a.format.localeCompare(b.format));
}

await mkdir(reportsDir, { recursive: true });

const results = [];

for (const item of manifest.files) {
  const fileName = `${item.id}.${item.format}`;
  const filePath = join(corpusDir, fileName);
  const fileStats = await stat(filePath);
  const bytes = await readFile(filePath);
  const uint8 = new Uint8Array(bytes);
  const detectedFormat = formatFromBytes(uint8) ?? formatFromPath(fileName);
  const conversionFormat = detectedFormat ?? item.format;
  const timings = [];
  let markdown = '';
  let error = null;

  for (let i = 0; i < manifest.runsPerFile; i += 1) {
    const start = performance.now();
    try {
      markdown = toMarkdownBytes(uint8, conversionFormat);
      timings.push(performance.now() - start);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      break;
    }
  }

  const ok = error == null && markdown.trim().length > 0;
  const result = {
    id: item.id,
    fileName,
    format: item.format,
    detectedFormat,
    conversionFormat,
    source: item.source,
    bytes: fileStats.size,
    ok,
    runs: timings.length,
    medianMs: timings.length === 0 ? null : median(timings),
    minMs: timings.length === 0 ? null : Math.min(...timings),
    maxMs: timings.length === 0 ? null : Math.max(...timings),
    markdownChars: markdown.length,
    headings: countHeadings(markdown),
    tableLines: countTables(markdown),
    error,
  };

  results.push(result);
  console.log(`${ok ? 'ok  ' : 'fail'} ${fileName} ${result.medianMs?.toFixed(2) ?? '-'}ms`);
}

const successful = results.filter((result) => result.ok);
const generatedAt = new Date().toISOString();
const summary = {
  generatedAt,
  runsPerFile: manifest.runsPerFile,
  totalFiles: results.length,
  successfulFiles: successful.length,
  successRate: results.length === 0 ? 0 : successful.length / results.length,
  medianMs: successful.length === 0 ? null : median(successful.map((result) => result.medianMs)),
  totalBytes: results.reduce((sum, result) => sum + result.bytes, 0),
  totalMarkdownChars: results.reduce((sum, result) => sum + result.markdownChars, 0),
  byFormat: summarizeByFormat(results),
};

const report = { summary, results };
await writeFile(join(reportsDir, 'anydoc-benchmark.json'), `${JSON.stringify(report, null, 2)}\n`);

const markdownRows = results.map((result) => (
  `| ${result.format.toUpperCase()} | ${result.fileName} | ${result.ok ? 'pass' : 'fail'} | ${result.medianMs?.toFixed(2) ?? '-'} | ${result.markdownChars} | ${result.tableLines} | ${result.error ?? ''} |`
));

await writeFile(join(reportsDir, 'anydoc-benchmark.md'), [
  '# Anydoc Benchmark',
  '',
  `Generated: ${generatedAt}`,
  `Runs per file: ${manifest.runsPerFile}`,
  `Success: ${summary.successfulFiles}/${summary.totalFiles}`,
  `Median conversion: ${summary.medianMs?.toFixed(2) ?? '-'} ms`,
  '',
  '| Format | File | Status | Median ms | Markdown chars | Table lines | Error |',
  '| --- | --- | --- | ---: | ---: | ---: | --- |',
  ...markdownRows,
  '',
].join('\n'));

const appData = `export const anydocBenchmark = ${JSON.stringify({
  generatedAt,
  runsPerFile: summary.runsPerFile,
  totalFiles: summary.totalFiles,
  successfulFiles: summary.successfulFiles,
  successRate: summary.successRate,
  medianMs: summary.medianMs,
  totalBytes: summary.totalBytes,
  totalMarkdownChars: summary.totalMarkdownChars,
  byFormat: summary.byFormat,
}, null, 2)} as const;\n`;

await writeFile(appDataPath, appData);
