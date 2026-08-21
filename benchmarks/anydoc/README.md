# Anydoc Benchmark

This benchmark exercises Anydoc's non-PDF conversion paths with a compact mixed corpus.

## Corpus

The downloaded files are intentionally not committed. Run the benchmark command to rebuild the local corpus from `manifest.json`.

Sources:

- Unstructured `example-docs`
- Apache Tika test documents
- Apache POI signed Office fixtures

Covered formats:

- Word: `.doc`, `.docx`
- PowerPoint: `.ppt`, `.pptx`
- Excel: `.xls`, `.xlsx`
- OpenDocument: `.odt`
- Rich Text Format: `.rtf`
- EPUB: `.epub`
- CSV: `.csv`

## Commands

```bash
npm run benchmark:anydoc:download
npm run benchmark:anydoc
```

Outputs:

- `benchmarks/anydoc/reports/anydoc-benchmark.json`
- `benchmarks/anydoc/reports/anydoc-benchmark.md`
- `src/data/anydocBenchmarkData.ts`
