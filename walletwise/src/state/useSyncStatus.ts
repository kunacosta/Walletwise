import { create } from 'zustand';
import type { DocumentData, QuerySnapshot } from 'firebase/firestore';

interface SyncState {
  online: boolean; // navigator online
  connected: boolean; // has reached Firestore backend at least once
  pendingWrites: boolean;
  lastError: string | null;
  lastSyncedAt: Date | null;
  init: () => void;
  setOnline: (online: boolean) => void;
  setError: (message: string | null) => void;
  setPendingWrites: (pending: boolean) => void;
  markSyncedNow: () => void;
  updateFromSnapshot: (snapshot: QuerySnapshot<DocumentData>) => void;
}

export const useSyncStatus = create<SyncState>((set, get) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  connected: false,
  pendingWrites: false,
  lastError: null,
  lastSyncedAt: null,
  init: () => {
    if (typeof window === 'undefined') return;
    const on = () => set({ online: true });
    const off = () => set({ online: false });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
  },
  setOnline: (online) => set({ online }),
  setError: (message) => set({ lastError: message }),
  setPendingWrites: (pending) => set({ pendingWrites: pending }),
  markSyncedNow: () => set({ lastSyncedAt: new Date(), pendingWrites: false, lastError: null, connected: true }),
  updateFromSnapshot: (snapshot) => {
    const meta = snapshot.metadata;
    const pending = meta.hasPendingWrites === true;
    // Consider "connected" once we receive any non-cache snapshot
    const connectedNow = get().connected || meta.fromCache === false;
    const next: Partial<SyncState> = {
      pendingWrites: pending,
      connected: connectedNow,
    };
    if (!pending && meta.fromCache === false) {
      next.lastSyncedAt = new Date();
      next.lastError = null;
    }
    set(next as SyncState);
  },
}));

