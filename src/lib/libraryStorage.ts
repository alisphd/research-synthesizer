import { PaperAnalysis } from '../types';

const LIBRARY_STORAGE_KEY = 'research-synth.library';

export function getStoredLibrary(): PaperAnalysis[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLibrary(papers: PaperAnalysis[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(papers));
}
