# Changelog

## [Unreleased]
- Added transaction modal validation and category syncing to prevent stale form data from reaching Firestore.
- Implemented optimistic transaction create/update flows with rollback and user feedback.
- Hardened ledger subscription handling to avoid duplicate listeners, keep transactions sorted, and surface datastore errors.
- Enforced authentication guardrails and Firestore persistence so writes only occur for signed-in users and protected routes wait for auth resolution.

