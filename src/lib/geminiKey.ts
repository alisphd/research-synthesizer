const GEMINI_API_KEY_STORAGE_KEY = 'research-synth.gemini-api-key';

export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)?.trim() ?? '';
}

export function saveGeminiApiKey(apiKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey.trim());
}

export function clearGeminiApiKey() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
}

export function maskGeminiApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();

  if (trimmed.length <= 8) {
    return 'saved in this browser';
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}
