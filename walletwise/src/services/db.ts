import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { useSyncStatus } from '../state/useSyncStatus';
import type { Transaction, TransactionInput, TransactionPatch } from '../types/transaction';

const randomId = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);

const getCurrentUid = (): string => {
  const current = auth.currentUser;
  if (current?.uid) return current.uid;
  // Offline fallback: use last known uid persisted by the auth listener
  try {
    const last = localStorage.getItem('walletwise:lastUid');
    if (last) return last;
  } catch {
    // ignore storage errors
  }
  throw new Error('User session not found. Please sign in again.');
};

const transactionsCollectionRef = (uid: string) => collection(db, 'users', uid, 'transactions');

const toFirestorePayload = (input: TransactionInput | TransactionPatch) => {
  const payload: Record<string, unknown> = {};

  if (input.type !== undefined) {
    payload.type = input.type;
  }
  if (input.amount !== undefined) {
    payload.amount = input.amount;
  }
  if (input.category !== undefined) {
    payload.category = input.category;
  }
  if (input.subcategory !== undefined) {
    payload.subcategory = input.subcategory;
  }
  if ('accountId' in input) {
    payload.accountId = (input as any).accountId ?? null;
  }
  if ('note' in input) {
    payload.note = input.note ?? null;
  }
  if (input.date instanceof Date) {
    payload.date = Timestamp.fromDate(input.date);
  }

  return payload;
};

const convertTimestamp = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
};

const mapTransaction = (snapshot: QueryDocumentSnapshot<DocumentData>): Transaction => {
  const data = snapshot.data();
  const dateValue = data.date;

  if (!(dateValue instanceof Timestamp || dateValue instanceof Date)) {
    throw new Error('Transaction is missing a valid date.');
  }

  return {
    id: snapshot.id,
    type: data.type as Transaction['type'],
    amount: Number(data.amount ?? 0),
    accountId: data.accountId ? String(data.accountId) : undefined,
    category: String(data.category ?? ''),
    subcategory: data.subcategory ? String(data.subcategory) : undefined,
    note: typeof data.note === 'string' && data.note.length > 0 ? data.note : undefined,
    date: dateValue instanceof Timestamp ? dateValue.toDate() : (dateValue as Date),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    pending: snapshot.metadata.hasPendingWrites === true,
  };
};

export const addTransaction = async (input: TransactionInput): Promise<string> => {
  if (input.amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const uid = getCurrentUid();
  const ref = transactionsCollectionRef(uid);
  const payload = {
    ...toFirestorePayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // mark pending before local write so UI can reflect immediately
  try {
    useSyncStatus.getState().setPendingWrites(true);
  } catch {}
  const docRef = await addDoc(ref, payload);
  // resolve when this write reaches the server
  try {
    const { waitForPendingWrites } = await import('firebase/firestore');
    void waitForPendingWrites(db).then(() => {
      try { useSyncStatus.getState().markSyncedNow(); } catch {}
    });
  } catch {}
  return docRef.id;
};

export const updateTransaction = async (
  id: string,
  patch: TransactionPatch,
): Promise<void> => {
  if (patch.amount !== undefined && patch.amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const uid = getCurrentUid();
  const docRef = doc(db, 'users', uid, 'transactions', id);
  const payload = {
    ...toFirestorePayload(patch),
    updatedAt: serverTimestamp(),
  };

  try { useSyncStatus.getState().setPendingWrites(true); } catch {}
  await updateDoc(docRef, payload);
  try {
    const { waitForPendingWrites } = await import('firebase/firestore');
    void waitForPendingWrites(db).then(() => {
      try { useSyncStatus.getState().markSyncedNow(); } catch {}
    });
  } catch {}
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const uid = getCurrentUid();
  const docRef = doc(db, 'users', uid, 'transactions', id);
  try { useSyncStatus.getState().setPendingWrites(true); } catch {}
  await deleteDoc(docRef);
  try {
    const { waitForPendingWrites } = await import('firebase/firestore');
    void waitForPendingWrites(db).then(() => {
      try { useSyncStatus.getState().markSyncedNow(); } catch {}
    });
  } catch {}
};

export const addTransfer = async (input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  note?: string;
}): Promise<void> => {
  if (!(input.amount > 0)) throw new Error('Amount must be greater than zero.');
  if (input.fromAccountId === input.toAccountId) throw new Error('Pick two different accounts.');
  const uid = getCurrentUid();
  const ref = transactionsCollectionRef(uid);
  const batch = writeBatch(db);
  const linkId = randomId();
  const base = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    date: Timestamp.fromDate(input.date),
    note: input.note ?? null,
    transferId: linkId,
    category: 'Transfer',
  } as Record<string, unknown>;
  // Expense from source
  const fromDoc = doc(ref);
  batch.set(fromDoc, {
    ...base,
    type: 'expense',
    amount: input.amount,
    accountId: input.fromAccountId,
  });
  // Income to target
  const toDoc = doc(ref);
  batch.set(toDoc, {
    ...base,
    type: 'income',
    amount: input.amount,
    accountId: input.toAccountId,
  });
  try { useSyncStatus.getState().setPendingWrites(true); } catch {}
  await batch.commit();
  try {
    const { waitForPendingWrites } = await import('firebase/firestore');
    void waitForPendingWrites(db).then(() => {
      try { useSyncStatus.getState().markSyncedNow(); } catch {}
    });
  } catch {}
};

export const subscribeTransactions = (
  uid: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const q = query(
    transactionsCollectionRef(uid),
    orderBy('date', 'desc'),
    limit(500),
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      try { useSyncStatus.getState().updateFromSnapshot(snapshot as any); } catch {}
      const transactions = snapshot.docs.map(mapTransaction);
      onData(transactions);
    },
    (error) => {
      console.error('Failed to subscribe to transactions', error);
      try { useSyncStatus.getState().setError(error.message || 'Sync error'); } catch {}
      onError?.(error);
    },
  );
};
