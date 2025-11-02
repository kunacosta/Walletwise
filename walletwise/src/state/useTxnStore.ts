import { create } from 'zustand';
import type { Transaction, TransactionPatch } from '../types/transaction';
import { subscribeTransactions } from '../services/db';

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
  subscribe: (uid: string) => {
    const previousUnsubscribe = get().unsubscribe;
    previousUnsubscribe?.();

    set({ loading: true, error: null });

    const unsubscribe = subscribeTransactions(
      uid,
      (transactions) => {
        set({
          items: sortTransactions(transactions),
          loading: false,
          error: null,
        });
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
