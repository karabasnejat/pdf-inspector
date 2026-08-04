# Product Requirements Document

## Product Name

PDF Inspector Web App

## Overview

PDF Inspector Web App is a browser-based demo and exploration interface for Firecrawl's `pdf-inspector` engine. The product allows a user to upload a PDF locally in the browser, inspect document classification results, review extracted Markdown output, and understand how the parser can also be used from a local CLI workflow.

The app is designed as a polished, lightweight showcase for the `pdf-inspector` project rather than a full document management platform.

## Goal

Create a modern TypeScript web application that:

1. Lets users upload and process PDF files directly in the browser.
2. Demonstrates the value of `pdf-inspector` classification and extraction clearly.
3. Presents the product with a refined landing-page experience.
4. Shows both interactive browser usage and local CLI usage in the same interface.
5. Works well on desktop and mobile screens.

## Target User

- Developers evaluating `pdf-inspector`
- Technical users comparing PDF extraction tools
- Product or AI teams exploring OCR routing and Markdown extraction workflows
- Open-source users who want a quick local demo without building backend infrastructure

## Core Value Proposition

- Local-first PDF analysis in the browser via WebAssembly
- No server upload required for the demo flow
- Fast inspection of PDF type and extracted content
- Clear presentation of classification, confidence, OCR needs, and Markdown output
- Visual explanation of CLI-based local usage alongside the web experience

## Scope

### In Scope

- Single-page frontend application
- PDF upload via click or drag and drop
- Browser-side PDF processing with `@firecrawl/pdf-inspector-wasm`
- Display of PDF classification and extraction results
- Markdown and simplified raw-text viewing modes
- Benchmark comparison table shown below the upload/hero section
- Landing-page style hero with CTA and terminal mockup
- Responsive behavior for mobile and tablet devices
- Light visual theme

### Out of Scope

- User authentication
- Persistent storage
- Backend API
- Multi-file queue management
- OCR service integration
- Export workflows beyond viewing extracted content
- PDF annotation or editing

## Functional Requirements

### 1. Hero Section

- The page must present a headline for the product.
- The headline must use a more expressive animated treatment.
- The supporting description must be in English.
- A primary CTA labeled `Try it locally` must be shown.
- Clicking the CTA must open the local file picker.
- Supporting badges must communicate open-source and Rust-based positioning.

### 2. Upload Experience

- Users must be able to click the upload area to select a PDF.
- Users must be able to drag and drop a PDF file into the upload area.
- The upload area copy must be in English.
- The app must reject non-PDF files with an error message.
- The upload area must include motion feedback on hover and drag-over states.

### 3. Processing Experience

- While the WASM module is loading, the UI must show a loading message.
- While a PDF is being processed, the UI must show an animated loading state.
- The processing state must visually communicate extraction activity.

### 4. PDF Analysis Results

- After successful processing, the app must show:
  - PDF type
  - confidence score
  - file name
  - page count
  - pages needing OCR
  - processing time
  - pages containing tables
  - encoding issue status
- The PDF type must be visually distinguished with status styling.
- Confidence must be visualized with a progress bar.

### 5. Extracted Content Viewer

- If Markdown output exists, the app must display it.
- The viewer must support two tabs:
  - Markdown
  - Raw text
- The content area must be scrollable for large outputs.

### 6. CLI Showcase

- The interface must include a terminal-style visual block.
- The terminal mockup must demonstrate local installation and usage.
- The terminal block must show example Markdown output.
- The terminal block must show metadata such as document type, output format, and engine.

### 7. Benchmark Section

- A benchmark table must appear below the upload/hero area.
- The table must visually highlight `pdf-inspector`.
- On smaller screens, the benchmark table must remain usable without breaking layout.

### 8. Mobile Responsiveness

- The page must adapt to narrow screens.
- Hero content must stack vertically on mobile.
- CTA layout must remain usable on small screens.
- Terminal and benchmark sections must avoid breaking the viewport.
- Dense information rows must reflow for readability on mobile.

## Design Requirements

## Visual Direction

- Use a light mode interface.
- Use a soft, light background tone.
- Keep the UI clean and editorial rather than dashboard-heavy.
- Use Signal Blue styling where emphasis is needed.
- Preserve subtle motion and interaction polish.

### Key Implemented Design Decisions

- Light background with white content panels
- Blue primary CTA
- Animated gradient headline treatment for `PDF Inspector`
- Hover and drag animations on the upload panel
- Spinner and animated dots during processing
- Staggered entrance animation for result cards
- Dark terminal mockup used as contrast against the light page

## Content Requirements

- Hero explanatory copy must be in English.
- Upload area copy must be in English.
- Product data labels and result labels may remain localized if desired by the product owner.
- The app should communicate both browser-based use and local CLI use.

## Technical Requirements

- Framework: React
- Language: TypeScript
- Build tool: Vite
- PDF engine: `@firecrawl/pdf-inspector-wasm`
- Rendering model: client-side only
- File processing: browser memory via `Uint8Array`

## Current File/Architecture Summary

- `src/App.tsx`: main page layout and result rendering
- `src/usePdfInspector.ts`: WASM loading and PDF processing hook
- `src/index.css`: full visual system, layout, animation, and responsive rules
- `src/main.tsx`: React bootstrap
- `src/types/pdf-inspector-wasm.d.ts`: local type definitions for the WASM package

## UX Notes

- The landing section should immediately explain what the tool is.
- The `Try it locally` CTA should feel like the primary path into the experience.
- The terminal mockup should reassure technical users that the tool also works well in a local developer workflow.
- The results area should prioritize clarity over density.
- The benchmark table should serve as supporting proof, not the main call to action.

## Non-Functional Requirements

- Fast initial load for a frontend demo app
- Local processing where possible
- Clear visual hierarchy
- Reasonable accessibility through readable contrast and large tap targets
- Stable responsive behavior from mobile through desktop

## Success Criteria

- A user can open the page and understand the product within a few seconds.
- A user can upload a PDF without instruction.
- A user can see meaningful structured output from a sample document.
- A user can understand that the tool supports both browser and CLI usage.
- A user on mobile can still navigate the page and use the upload flow without layout breakage.

## Future Enhancements

- Add copy-to-clipboard for Markdown output
- Add downloadable extracted Markdown
- Add selectable processing options such as compact profile or page markers
- Add drag-and-drop active-state text changes
- Add sample PDF shortcuts
- Add dark mode as an optional theme rather than the default
- Add client-side Markdown rendering preview in addition to raw output

## Delivery Summary

The implemented product is a responsive, light-themed TypeScript web app that demonstrates PDF upload, browser-side extraction, animated feedback, structured results, CLI positioning, and benchmark proof points for Firecrawl's `pdf-inspector` engine.