# Decisions Log

## 2025-02-11

### Transaction modal validation and reset
- **What changed**: Rebuilt the modal's initial state logic and added validation that normalizes type, category/subcategory, amount, note, and date before submission (`src/components/TxnModal.tsx`).
- **Why it broke**: The form reused stale state between openings and accepted zero/invalid amounts when users flipped between income and expense, producing malformed payloads.
- **How it was fixed**: The modal now rehydrates state whenever it opens, guards the category/subcategory pair, and rejects non-positive or NaN amounts via a dedicated `validate` helper before the payload reaches Firestore.
- **Outcome**: Manually verified by reopening the modal, switching transaction types, and inspecting the computed payload to confirm only sanitized data is sent.

### Optimistic transaction updates with rollback
- **What changed**: Introduced optimistic create/update flows that insert a temporary transaction, update local state immediately, and roll back on failure while surfacing errors to the UI (`src/components/TxnModal.tsx`, `src/state/useTxnStore.ts`).
- **Why it broke**: The ledger previously waited on Firestore writes, leaving the UI unresponsive and, on failure, stranded in a partially updated state with no feedback.
- **How it was fixed**: Create now stages a temp record that is removed after Firestore succeeds or fails, while edits snapshot the original transaction and restore it if the remote patch throws; both paths push success or error messages into the toast pipeline.
- **Outcome**: Confirmed through local state inspection that temp entries disappear after success and that failures restore prior values and emit error toasts.

### Ledger subscription and state hygiene
- **What changed**: Consolidated transaction subscription management so only one listener is active per user, ensured items stay sorted by date, and funneled store errors into ledger toasts (`src/pages/Ledger.tsx`, `src/state/useTxnStore.ts`).
- **Why it broke**: Re-subscribing without cleanup spawned duplicate listeners, producing duplicate/out-of-order rows and masking Firestore listener errors.
- **How it was fixed**: The store now tracks and disposes the previous unsubscribe handle before wiring a new listener, always sorts on writes, and exposes errors that the ledger screen displays via toast notifications.
- **Outcome**: Verified by triggering new subscriptions (sign-in and UID changes) while observing that only one listener remains registered and the list ordering stays stable.

### Authentication and data guardrails
- **What changed**: Hardened Firebase setup with persistent caches, enforced authenticated writes, and ensured the UI defers navigation until auth settles (`src/services/firebase.ts`, `src/services/db.ts`, `src/main.tsx`, `src/components/PrivateRoute.tsx`).
- **Why it broke**: Without guards the app attempted Firestore writes before auth was ready, allowed zero-amount transactions, and briefly exposed protected routes during auth transitions.
- **How it was fixed**: Firestore now runs with `persistentLocalCache` support, every write path asserts a signed-in user and positive amounts, the auth listener updates loading state deterministically, and the private route shows a spinner until auth resolves.
- **Outcome**: Observed app startup and route gating in the simulator to confirm no unauthenticated writes occur and protected screens stay hidden until the user is resolved.

