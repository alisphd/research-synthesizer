export interface FirebaseRuntimeConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'research-synth.firebase-config';

const REQUIRED_FIREBASE_FIELDS: (keyof FirebaseRuntimeConfig)[] = [
  'projectId',
  'appId',
  'apiKey',
  'authDomain',
  'firestoreDatabaseId',
  'storageBucket',
  'messagingSenderId',
];

function normalizeFirebaseConfig(value: unknown): FirebaseRuntimeConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Firebase config must be a JSON object.');
  }

  const rawConfig = value as Record<string, unknown>;
  const config: FirebaseRuntimeConfig = {
    projectId: String(rawConfig.projectId ?? '').trim(),
    appId: String(rawConfig.appId ?? '').trim(),
    apiKey: String(rawConfig.apiKey ?? '').trim(),
    authDomain: String(rawConfig.authDomain ?? '').trim(),
    firestoreDatabaseId: String(rawConfig.firestoreDatabaseId ?? '').trim(),
    storageBucket: String(rawConfig.storageBucket ?? '').trim(),
    messagingSenderId: String(rawConfig.messagingSenderId ?? '').trim(),
    measurementId: String(rawConfig.measurementId ?? '').trim(),
  };

  for (const field of REQUIRED_FIREBASE_FIELDS) {
    if (!config[field]) {
      throw new Error(`Firebase config is missing "${field}".`);
    }
  }

  if (!config.measurementId) {
    delete config.measurementId;
  }

  return config;
}

export function parseFirebaseConfig(input: string): FirebaseRuntimeConfig {
  return normalizeFirebaseConfig(JSON.parse(input));
}

export function getStoredFirebaseConfig(): FirebaseRuntimeConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawConfig = window.localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
  if (!rawConfig) {
    return null;
  }

  try {
    return parseFirebaseConfig(rawConfig);
  } catch {
    window.localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
    return null;
  }
}

export function saveFirebaseConfig(config: FirebaseRuntimeConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearStoredFirebaseConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
}

export function formatFirebaseConfig(config: FirebaseRuntimeConfig): string {
  return JSON.stringify(config, null, 2);
}

export function describeFirebaseConfig(config: FirebaseRuntimeConfig): string {
  return `${config.projectId} (${config.authDomain})`;
}
