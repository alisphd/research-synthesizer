import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStoredFirebaseConfig, type FirebaseRuntimeConfig } from './lib/firebaseConfig';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  config: FirebaseRuntimeConfig;
}

let cachedServices: FirebaseServices | null = null;
let cachedConfigSignature = '';

function buildConfigSignature(config: FirebaseRuntimeConfig) {
  return JSON.stringify(config);
}

export function getFirebaseServices(
  config: FirebaseRuntimeConfig | null = getStoredFirebaseConfig(),
): FirebaseServices | null {
  if (!config) {
    return null;
  }

  const configSignature = buildConfigSignature(config);
  if (cachedServices && cachedConfigSignature === configSignature) {
    return cachedServices;
  }

  const appName = `research-synth:${config.projectId}:${config.appId}`;
  const existingApp = getApps().find((app) => app.name === appName);
  const { firestoreDatabaseId, ...firebaseOptions } = config;
  const app = existingApp ?? initializeApp(firebaseOptions, appName);
  const auth = getAuth(app);
  const db = getFirestore(app, firestoreDatabaseId);

  cachedServices = { app, auth, db, config };
  cachedConfigSignature = configSignature;
  return cachedServices;
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(config?: FirebaseRuntimeConfig | null) {
  const services = getFirebaseServices(config ?? getStoredFirebaseConfig());
  if (!services) {
    throw new Error('Add your Firebase config first.');
  }

  await signInWithPopup(services.auth, googleProvider);
}

export async function logout(config?: FirebaseRuntimeConfig | null) {
  const services = getFirebaseServices(config ?? getStoredFirebaseConfig());
  if (!services) {
    return;
  }

  await signOut(services.auth);
}
