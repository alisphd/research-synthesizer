# Research Synth

Research Synth is an AI-powered literature review app for building a personal research library from PDFs. It analyzes papers with Gemini, generates summaries and tags, lets you chat across your library, and supports JSON import/export for moving your data anywhere.

## Current behavior

- No sign-in required
- No cloud sync
- Library stays in the current browser using local storage
- Full JSON import/export for backup and sharing

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Google Gemini via `@google/genai`
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
4. Paste your Gemini API key into the in-app "Gemini API key" box.

The Gemini key is stored only in your browser with `localStorage`. It is not committed to the repo or baked into the build.

## Deploy to GitHub Pages

This repo includes [`.github/workflows/deploy-pages.yml`](/D:/Codex/research-synthesizer/.github/workflows/deploy-pages.yml), so pushes to `main` deploy automatically.

The live site is:

[https://alisphd.github.io/research-synthesizer/](https://alisphd.github.io/research-synthesizer/)

If you fork or rename the repo, the workflow automatically builds with the correct repository path.

## Notes

- Anyone using the app needs their own Gemini API key.
- Paper metadata and AI outputs persist in the current browser until cleared or replaced.
- Use Export regularly if you want portable backups of your library.
