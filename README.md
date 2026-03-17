# Research Synth

Research Synth is an AI-powered literature review and research-library app. Upload papers, extract structured summaries with Gemini, sync your collection with Firebase, chat across your library, and generate domain syntheses and gap analyses.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Firebase Auth + Firestore
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
4. Paste your Firebase web config JSON into the in-app "Firebase config" box if you want Google sign-in and cloud sync.
5. Paste your Gemini API key into the in-app "Gemini API key" box.

Both configs are stored only in your browser with `localStorage`. They are not committed to the repo or baked into the build.

## Deploy to GitHub Pages

This repo includes [`.github/workflows/deploy-pages.yml`](/D:/Codex/research-synthesizer/.github/workflows/deploy-pages.yml), so every push to `main` or `master` can deploy automatically.

1. Create a new GitHub repository, ideally named `research-synthesizer`.
2. From [D:\Codex\research-synthesizer](/D:/Codex/research-synthesizer), run:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/research-synthesizer.git
   git push -u origin main
   ```
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Wait for the `Deploy to GitHub Pages` workflow to finish.
6. Your site will be available at:
   `https://YOUR_USERNAME.github.io/research-synthesizer/`

If you use a different repository name, the workflow still builds with that repo path automatically.

## Firebase setup for GitHub Pages

Because this app uses Google Sign-In, you need to allow your GitHub Pages domain in Firebase:

1. Open Firebase Console -> `Authentication` -> `Settings` -> `Authorized domains`.
2. Add `YOUR_USERNAME.github.io`.
3. Save.

You will also need your Firebase web app config JSON plus `firestoreDatabaseId` when you first open the app, because Firebase config is now entered in the browser at runtime instead of being committed to GitHub.

## Notes

- GitHub Pages can host this app because it is a static Vite build.
- Each user needs their own Gemini API key unless you later move Gemini calls to a backend.
- Firebase config has been removed from the repository and is now entered locally in the browser.
- Firestore access remains protected by your Firebase security rules.
