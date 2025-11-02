# Walletwise

## Environment Setup

Place a `.env` file at the project root with the Firebase configuration before starting the app.

```env
VITE_FB_API_KEY=xxx
VITE_FB_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FB_PROJECT_ID=xxx
VITE_FB_APP_ID=1:xxx:web:yyy
VITE_FB_STORAGE_BUCKET=xxx.appspot.com
VITE_FB_MESSAGING_SENDER_ID=xxx
```

## Local Development

1. Install dependencies with `npm install`.
2. Run the app with `ionic serve` (or `npm run dev` for the Vite development server).

## Android Build

1. Execute `ionic build` to produce the web assets.
2. Run `npx cap sync android` to update the Android project.
3. Open Android Studio with `npx cap open android` to build or deploy.

## Project Notes

- Firestore persistence is enabled in `src/services/firebase.ts` via `persistentLocalCache(...)` for offline-first behavior and multi-tab coordination.
- Assignment 2 focuses on CRUD and caching; the final project expands to native features and monetization.

## Security

Firestore rules restrict every read/write to the signed-in user's documents:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/transactions/{txId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid}/profile/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

After publishing the rules, open the browser console during development and run:

```ts
await import("/src/services/db.dev.ts").then(m => m.tryAddWhileSignedOut());
```

It should resolve to a `permission-denied` error once the rules are active.

## Demo Checklist

- Login -> Create -> Read (realtime) -> Update -> Delete -> (Optional) Offline
