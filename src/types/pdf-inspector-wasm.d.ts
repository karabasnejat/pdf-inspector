declare module '@firecrawl/pdf-inspector-wasm' {
  export type PdfType = "TextBased" | "Scanned" | "ImageBased" | "Mixed";
  export type MarkdownProfile = "fidelity" | "compact";

  export interface ProcessOptions {
    pages?: number[];
    password?: string;
    profile?: MarkdownProfile;
    includePageMarkers?: boolean;
    includeImages?: boolean;
  }

  export interface PageOcrReasons {
    page: number;
    reasons: string[];
  }

  export interface LayoutComplexity {
    isComplex: boolean;
    pagesWithTables: number[];
    pagesWithColumns: number[];
  }

  export interface PdfProcessResult {
    pdfType: PdfType;
    markdown?: string;
    pageCount: number;
    processingTimeMs: number;
    pagesNeedingOcr: number[];
    ocrReasonsByPage: PageOcrReasons[];
    title?: string;
    confidence: number;
    layout: LayoutComplexity;
    hasEncodingIssues: boolean;
  }

  export function processPdf(data: Uint8Array, options?: ProcessOptions): PdfProcessResult;
  export function classifyPdf(data: Uint8Array): { pdfType: PdfType; pageCount: number; pagesNeedingOcr: number[]; confidence: number };
  export function extractText(data: Uint8Array): string;
  export function version(): string;

  export default function init(module_or_path?: unknown): Promise<unknown>;
}
