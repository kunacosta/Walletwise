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

export const db = initializeFirestore(app, {
  localCache: selectedCache,
});

// sanity check so you know envs are loaded
console.log("Firebase project:", import.meta.env.VITE_FB_PROJECT_ID);

// Convenience re-exports so feature code can import from a single module.
// Note: core CRUD lives in `./db`. These are pass-through exports.
export { addTransaction, updateTransaction, deleteTransaction, subscribeTransactions } from './db';
