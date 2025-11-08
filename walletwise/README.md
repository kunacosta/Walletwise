# Walletwise

## Environment Setup

1) Copy the example env file and fill in your Firebase project values:

```bash
cp .env.example .env
```

2) Required Vite env keys (read via `import.meta.env` in `src/services/firebase.ts`):

```env
VITE_FB_API_KEY=your_api_key
VITE_FB_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FB_PROJECT_ID=your_project_id
VITE_FB_APP_ID=1:xxxxx:web:yyyyy
VITE_FB_STORAGE_BUCKET=your_project.appspot.com
VITE_FB_MESSAGING_SENDER_ID=1234567890
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
- Cache keys are namespaced with prefix `walletwise:v1:*` (see `src/constants/cacheKeys.ts`).
- Categories are seeded on first run at `users/{uid}/categories` with system defaults and subcategories; users can add/edit their own categories.
- Notifications: Local push uses Capacitor Local Notifications. Enable in Settings and grant permission. Scheduling happens on app open and whenever bills/accounts change. Includes bill reminders (3 days before, morning of, overdue) and overspending alerts (once per day max when safe‑to‑spend falls below buffer).

## Authentication & Security

- Email/Password auth via Firebase.
- Auth state observed in `src/main.tsx`; `useAuthStore` and `AuthProvider` expose `uid` throughout the app.
- Protected routes: see `src/components/PrivateRoute.tsx`.
- Firestore data is namespaced under `users/{uid}/...` for all collections: `transactions`, `accounts`, `bills`, `categories`.
- Security rules (`firestore.rules`) restrict all reads/writes to `request.auth.uid == uid` and add basic field validation.

Demo Isolation Test
- Sign in as User A and create a transaction and an account.
- Sign out, sign in as User B: confirm User A’s data does not appear (Ledger, Accounts, Bills, Categories all empty for B).

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

## Grader Walkthrough

Project & Firebase Setup
- Copy `.env` template above to `.env` with your Firebase project values.
- Run `npm install` then `ionic serve` to start the app.
- Confirm console shows the project ID from `src/services/firebase.ts` initialization.

CRUD Functionality
- Login or Register.
- Create: On the Ledger page, tap the + button, fill Amount (>0), Date, Category, and Save. A new row appears immediately; Firestore write confirms.
- Read (realtime): Create a transaction in a second browser window with the same account; the first window updates instantly via `onSnapshot`.
- Update: Swipe a row → Edit, change fields, Save. The list updates optimistically and is confirmed by Firestore.
- Delete: Swipe a row → Delete. The item disappears optimistically; Firestore confirms deletion or reverts on error.

Data Caching
- Close the app tab, then reopen it. Cached transactions render instantly from client storage.
- Within a second, the Firestore live listener refreshes the list; cache is updated.

Code Quality & Demonstration
- Ionic components (`IonPage`, `IonList`, `IonModal`, etc.) across pages/components.
- Modular Firebase SDK (`addDoc`, `onSnapshot`, `updateDoc`, `deleteDoc`) used in `src/services/db.ts`.
- Validation: `TxnModal` enforces positive amount and valid date.

## Dashboard UI

- Refactored Dashboard to emphasize Safe to spend with a clean, readable layout.
- New UI atoms under `src/components/ui/`: `StatTile`, `AccountCard`, `ErrorBanner`, `EmptyState`, `SkeletonList`, and `Money` for consistent currency formatting.
- Top card shows overall Safe to spend and subtext: "Across non-credit accounts • Window: N days".
- Quick stats row includes: Due today, Obligations (N days), Bills pending.
- Accounts render as responsive cards (two per row on tablet) with safe-to-spend, balance, and obligations.
- Loading renders skeletons; errors show a banner; empty accounts show an empty state.

Screenshots
- Placeholder: add a short GIF of the Dashboard here (e.g., `docs/dashboard.gif`).
- Placeholder image: `docs/dashboard.png`.

## Accounts

Manage financial accounts under `users/{uid}/accounts`.

- Create up to 5 accounts on the free plan (Bank, eWallet, Cash, Credit). The "New Account" button disables after 5 with an "Upgrade to Pro" prompt (not wired yet).
- View: Accounts grid (`IonCard`) shows name, type, institution, masked number, and current balance.
- Edit: Tap a card to open details sheet; you can edit `balanceCurrent` directly (no transaction is created).
- Delete: From the details sheet.
- Caching: Accounts list hydrates from client cache immediately, then refreshes via Firestore snapshot (uses `@ionic/storage`).

Manual Test Steps
- Create 1–2 accounts. Refresh: cached grid renders instantly, then updates from Firestore.
- Edit a card's balance and confirm the new balance persists.
- Delete an account and confirm the grid updates.

## Spendable Logic

Definitions (per account):
- spendableNow = balanceCurrent − holdsToday − dueToday
- safeToSpend = balanceCurrent − obligationsWindow − holdsWindow − earmarks − buffer

Defaults (Settings)
- Window: 14 days
- Buffer: RM 50 fixed
- Include credit accounts in overall safe-to-spend: disabled by default

Implementation
- Bills live at `users/{uid}/bills` with fields `{ id, name, amount, dueDate, repeat, accountId, overrideAccountId?, status, lastPaidAt?, notes }`.
- Hook `useBills(uid)` provides CRUD, cache hydration, and helpers to compute `getUnpaidInWindow(accountId, start, end)` and `getDueToday(accountId, today)`.
- Module `src/features/spendable/spendable.ts` computes per-account spendable values and overall aggregate across non-credit accounts.
- Settings store `src/state/settings.ts` holds window/buffer and inclusion flags.

Manual Test Steps
- Create a few bills with due dates today and within the next 14 days.
- Observe Dashboard: Safe to spend, Due Today badge, and Obligations next N days reflect bill totals.
- Toggle credit account type (if any) to see it excluded from top aggregate by default.

## Calendar (Month Grid)

- A month grid displays net per day (income − expense) and small badges for bills due that day.
- Tapping a day opens a drawer listing that day’s transactions and bills, with a quick “Add Transaction” prefilled to that day.
- Month navigation via chevrons; header summarizes total income, expense, and net for the month.
- Data hydrates from cache first (transactions and bills) and then refreshes from Firestore via live snapshots.

Manual Flow
- Navigate to `/calendar`.
- Use prev/next to change months; verify header summary updates.
- Tap a day with data to view details; add a quick transaction and confirm it appears in the day list and month net.
- Bills with due dates (including repeating) show badges and appear in the day drawer.

Screenshots
- Add calendar grid and day drawer screenshots to your repo (e.g., `docs/calendar-grid.png`, `docs/day-drawer.png`) and link them here.

## Notifications Center

- Route: `/notifications` shows pending scheduled notifications.
- Actions: Refresh and Clear All.
- Test: enable notifications, add bills, and adjust balances to trigger overspending.

## Final Steps

- Set Firebase env in `.env` and publish `firestore.rules` in the Firebase console.
- Run locally with `ionic serve` or build Android with `ionic build && npx cap sync android`.
- Optional: toggle Pro in Settings to unlock full analytics and account limits for the demo.
- For the written report, see `report_outline.md` for the suggested structure and key points to cover.
-## Pro (Simulated)

- Toggle Pro in Settings with “Upgrade to Pro” (simulated; stored via Ionic Storage). A “PRO” badge appears in page headers when active.
- Free vs Pro:
  - Accounts: Free up to 5; Pro unlimited
  - Analytics: Free current month only; Pro any month (full history)
  - Receipts: Free no attachments; Pro attachments (to be wired)
  - CSV Export: Free current month; Pro any period

Manual Test
- Open Settings → click “Upgrade to Pro”, confirm badge and expiration.
- Accounts: add more than 5 accounts (allowed when Pro is active).
- Analytics: navigate months and export CSV for non‑current months.
- Downgrade to Free and verify limits reapply.
