# WalletWise – Report Outline

## Overview
- Problem statement and target users (personal finance tracking on mobile/web).
- Value prop: fast, offline‑first ledger with realtime sync and simple insights.
- Scope: CRUD for transactions, accounts, bills; caching; notifications; analytics; simulated Pro.

## Architecture Diagram
- Frontend: Ionic React + Vite + Capacitor.
- State: Zustand stores (`useAuthStore`, `useTxnStore`, `useSettings`).
- Data layer: Firebase modular SDK.
  - `src/services/firebase.ts` (init, persistence enabled).
  - Collections per user: `users/{uid}/transactions|accounts|bills|categories`.
- Caching: `@ionic/storage` via `src/lib/cache.ts` with keys `walletwise:v1:*`.
- Realtime: Firestore `onSnapshot` in hooks (transactions/accounts/bills) → hydrate cache.
- Notifications: Capacitor Local Notifications; scheduler on app start and data changes.
- Charts/analytics: local selectors + accessible SVG donut; CSV export.

## Monetization Rationale
- Free plan: usable core tracking to acquire users; limits keep costs predictable (5 accounts; current‑month analytics/export; no receipts).
- Pro plan: lifts constraints that correlate with higher engagement and value (unlimited accounts; full‑history analytics; CSV any period; receipts/attachments).
- Implementation: simulated Pro flag persisted in Storage; UI badge; feature gating; future: in‑app purchase/subscription on mobile.

## Reflection
- What worked well: cache‑first UX with quick hydration; modular hooks; consistent key prefixing; per‑user rules.
- Challenges: platform plugin versions (Capacitor notification compatibility); ensuring strict TS while iterating quickly; maintaining accessibility in SVG charts.
- Testing and verification: manual flows for CRUD, realtime, cache; demo script scenarios; rules isolation check.
- Next steps: receipts with Firebase Storage; budgets and alerts; unit tests for selectors; deeper analytics; iOS/Android native polish; in‑app purchase integration.
