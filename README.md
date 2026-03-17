# Research Synth

Research Synth is a literature review showcase app for building a personal research library in the browser. It ships with a demo collection, lets you fetch public paper metadata from Crossref, generates local synthesis and chat responses from stored notes, and supports JSON import/export for moving your data anywhere.

## Current behavior

- No sign-in required
- No cloud sync
- No private API key required
- Library stays in the current browser using local storage
- Includes a built-in demo library for quick showcase use
- Can discover public paper metadata from Crossref
- Full JSON import/export for backup and sharing

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Crossref public API for metadata discovery
- Recharts + `react-force-graph-2d`

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open the app in your browser.
4. Load the demo library, search Crossref, or import a JSON library file.

## Deploy to GitHub Pages

This repo includes [`.github/workflows/deploy-pages.yml`](/D:/Codex/research-synthesizer/.github/workflows/deploy-pages.yml), so pushes to `main` deploy automatically.

The live site is:

[https://alisphd.github.io/research-synthesizer/](https://alisphd.github.io/research-synthesizer/)

If you fork or rename the repo, the workflow automatically builds with the correct repository path.

## Notes

- All data stays in the current browser until cleared or replaced.
- Demo synthesis and chat are generated from the metadata, summaries, tags, gaps, and future-direction notes stored in the app.
- Crossref results provide public metadata, not full-text article ingestion.
- Use Export regularly if you want portable backups of your library.
