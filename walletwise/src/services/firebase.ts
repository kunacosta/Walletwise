import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  connectFirestoreEmulator,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID
};

export const app = initializeApp(firebaseConfig);

// Ensure Auth works reliably in Capacitor/WebView and offline
// Prefer IndexedDB; fall back to localStorage if needed
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

// Firestore: enable offline persistence; fall back to in-memory if unavailable
let selectedCache: any;
try {
  selectedCache = persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  });
  console.log("Firestore cache: persistent IndexedDB (multi-tab)");
} catch (err) {
  console.warn("Persistent cache unavailable; using memory cache only", err);
  selectedCache = memoryLocalCache();
}

// Optionally force long polling (helps on some networks / proxies)
const extraFsOptions: Record<string, unknown> = {};
try {
  if (import.meta.env.VITE_FB_FORCE_LONG_POLLING === 'true') {
    extraFsOptions.experimentalForceLongPolling = true;
    extraFsOptions.useFetchStreams = false;
    console.warn('Firestore: experimentalForceLongPolling enabled');
  }
} catch {}

export const db = initializeFirestore(app, {
  localCache: selectedCache,
  ...(extraFsOptions as any),
});

// Optional: connect to local Firestore emulator if configured
try {
  const useEmu = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true';
  if (useEmu) {
    const host = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
    const port = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);
    connectFirestoreEmulator(db, host, port);
    console.warn(`Firestore emulator: ${host}:${port}`);
  }
} catch {}

// sanity check so you know envs are loaded
console.log("Firebase project:", import.meta.env.VITE_FB_PROJECT_ID);

// Convenience re-exports so feature code can import from a single module.
// Note: core CRUD lives in `./db`. These are pass-through exports.
export { addTransaction, updateTransaction, deleteTransaction, subscribeTransactions } from './db';
