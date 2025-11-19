import { create } from 'zustand';
import type { Transaction, TransactionPatch } from '../types/transaction';
import { subscribeTransactions } from '../services/db';
import { getCached, setCached } from '../lib/cache';
import { userTransactionsKey } from '../constants/cacheKeys';

interface TxnState {
  items: Transaction[];
  loading: boolean;
  error: string | null;
  unsubscribe?: () => void;
  setItems: (items: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  addLocal: (txn: Transaction) => void;
  updateLocal: (id: string, patch: TransactionPatch) => void;
  removeLocal: (id: string) => void;
  hydrateFromCache: (uid: string) => Promise<void>;
  subscribe: (uid: string) => () => void;
  clearSubscription: () => void;
}

const sortTransactions = (transactions: Transaction[]): Transaction[] =>
  [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());

export const useTxnStore = create<TxnState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  unsubscribe: undefined,
  setItems: (items) =>
    set({
      items: sortTransactions(items),
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
  setError: (message) => set({ error: message }),
  addLocal: (txn) =>
    set((state) => ({
      items: sortTransactions([txn, ...state.items.filter((item) => item.id !== txn.id)]),
    })),
  updateLocal: (id, patch) =>
    set((state) => ({
      items: sortTransactions(
        state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      ),
    })),
  removeLocal: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  hydrateFromCache: async (uid: string) => {
    try {
      const key = userTransactionsKey(uid);
      const cached = await getCached<Array<{
        id: string;
        type: Transaction['type'];
        amount: number;
        accountId?: string | null;
        category: string;
        subcategory?: string;
        note?: string;
        receiptUrl?: string;
        locationLat?: number;
        locationLng?: number;
        locationLabel?: string;
        date: string;
        createdAt?: string | null;
        updatedAt?: string | null;
      }>>(key);

      if (cached && Array.isArray(cached) && cached.length > 0) {
        const restored: Transaction[] = cached.map((c) => ({
          id: c.id,
          type: c.type,
          amount: c.amount,
          category: c.category,
          accountId: c.accountId ?? undefined,
          subcategory: c.subcategory ?? undefined,
          note: c.note,
           receiptUrl: c.receiptUrl,
           locationLat: c.locationLat,
           locationLng: c.locationLng,
           locationLabel: c.locationLabel,
          date: new Date(c.date),
          createdAt: c.createdAt ? new Date(c.createdAt) : null,
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : null,
        }));
        set({ items: sortTransactions(restored), loading: false, error: null });
      }
    } catch (e) {
      // Ignore cache errors; Firestore subscription will populate state
    }
  },
  subscribe: (uid: string) => {
    const previousUnsubscribe = get().unsubscribe;
    previousUnsubscribe?.();

    set({ loading: true, error: null });

    // Try to hydrate from client cache for instant render
    void get().hydrateFromCache(uid);

    const unsubscribe = subscribeTransactions(
      uid,
      (transactions) => {
        set({
          items: sortTransactions(transactions),
          loading: false,
          error: null,
        });
        // Persist latest snapshot to client cache (fire-and-forget)
        const key = userTransactionsKey(uid);
        void setCached(
          key,
          transactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            accountId: t.accountId ?? null,
            category: t.category,
            subcategory: t.subcategory ?? undefined,
            note: t.note,
            receiptUrl: t.receiptUrl,
            locationLat: t.locationLat,
            locationLng: t.locationLng,
            locationLabel: t.locationLabel,
            date: t.date.toISOString(),
            createdAt: t.createdAt ? t.createdAt.toISOString() : null,
            updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
          })),
        );
      },
      (error) => {
        set({
          error: error.message,
          loading: false,
        });
      },
    );

    set({ unsubscribe });
    return unsubscribe;
  },
  clearSubscription: () => {
    const existing = get().unsubscribe;
    existing?.();
    set({ unsubscribe: undefined });
  },
}));

// Ensure we always unsubscribe listeners on hot-reload or page unload
if (typeof window !== 'undefined') {
  let bound = false;
  const bind = () => {
    if (bound) return;
    bound = true;
    window.addEventListener('beforeunload', () => {
      const existing = useTxnStore.getState().unsubscribe;
      existing?.();
    });
  };
  // Bind once store is imported
  bind();
}

if (import.meta && (import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => {
    const existing = useTxnStore.getState().unsubscribe;
    existing?.();
  });
}
