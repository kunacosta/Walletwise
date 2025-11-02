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
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Transaction, TransactionInput, TransactionPatch } from '../types/transaction';

const getCurrentUid = (): string => {
  const current = auth.currentUser;
  if (!current?.uid) {
    throw new Error('User session not found. Please sign in again.');
  }
  return current.uid;
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
    category: String(data.category ?? ''),
    subcategory: String(data.subcategory ?? ''),
    note: typeof data.note === 'string' && data.note.length > 0 ? data.note : undefined,
    date: dateValue instanceof Timestamp ? dateValue.toDate() : (dateValue as Date),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
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

  const docRef = await addDoc(ref, payload);
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

  await updateDoc(docRef, payload);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const uid = getCurrentUid();
  const docRef = doc(db, 'users', uid, 'transactions', id);
  await deleteDoc(docRef);
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
    (snapshot) => {
      const transactions = snapshot.docs.map(mapTransaction);
      onData(transactions);
    },
    (error) => {
      console.error('Failed to subscribe to transactions', error);
      onError?.(error);
    },
  );
};
