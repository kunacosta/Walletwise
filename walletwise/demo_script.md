# WalletWise Demo Script (A2)

1) Intro (10s)
- Show login screen; mention Ionic React + Capacitor + Firebase Firestore.

2) Auth + Isolation (60s)
- Register a new user (or Login). Point out route guard (spinner then redirect).
- Multi-tab: open a second tab; both show the same signed-in user in Settings.
- Isolation: as User A, create a txn and an account; sign out. Login as User B; Ledger/Accounts are empty (per-user paths `users/{uid}/…` + rules).

3) CRUD + Realtime + Cache (90s)
- Create: Tap +, add an expense, Save. The item appears immediately (optimistic) and persists.
- Read (Realtime): In the second tab, add a txn; the first tab updates instantly without refresh.
- Update/Delete: Swipe ? Edit / Delete; highlight optimistic UI and revert-on-error.
- Cache-first: Hard refresh the tab. Transactions list renders instantly from cache, then live snapshot updates it.

4) Accounts + Spendable (60s)
- Show Accounts grid cards: type, institution, masked number, balance.
- Explain Safe-to-Spend: per-account badges; change an account balance in details; observe Dashboard cards updating.

5) Bills + Redirect Check (60s)
- Create two bills: one due today, one due in 3 days.
- Show Calendar month grid: bill badges on due days; open a day drawer to list txns + bills.
- Redirect feasibility (demo): In DevTools console, run `import('/src/features/spendable/spendable.ts').then(m => console.log(m.canCoverBill(accounts[0], bill, bills)))` to illustrate the rule. Mention UI wiring can call this before “Pay from different account”.

6) Notifications (60s)
- Settings ? enable Notifications; accept permission.
- Show Notifications Center with scheduled entries (today + 3-day reminder). Reduce an account balance below buffer to schedule a single overspending alert for today.

7) Analytics + Export (60s)
- Open Analytics: donut of expenses by category. Click a slice to drill into subcategories; Back to categories.
- Export CSV: click the export icon to download current month’s CSV (Free). Mention Pro allows any month.

8) Pro (Simulated) (60s)
- Settings ? Upgrade to Pro (simulated, 1-year); PRO badge appears.
- Create >5 accounts (limit lifted). In Analytics, navigate to a different month and export CSV.
- Downgrade to Free; limits re-apply.

9) Security Rules (30s)
- Reiterate per-user paths and rules. In console, attempt a write with a wrong uid (optional, shows permission-denied if rules are published).

10) Wrap (20s)
- Summarize: Auth, CRUD, realtime, cache-first, Accounts/Spendable, Bills/Calendar/Notifications, Analytics + CSV, Pro gating, and security isolation.