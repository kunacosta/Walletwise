import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import { db } from '../../services/firebase';
import type { Bill, BillRepeat, BillStatus } from '../../types/bill';
import { getCached, setCached } from '../../lib/cache';
import { userBillsKey } from '../../constants/cacheKeys';
import { isSameDay } from '../../lib/date';

export type BillInput = Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'lastPaidAt' | 'dueDate'> & {
  dueDate: Date;
};
export type BillPatch = Partial<BillInput> & {
  status?: BillStatus;
  overrideAccountId?: string | null;
  lastPaidAt?: Date | null;
};

const billsRef = (uid: string) => collection(db, 'users', uid, 'bills');

const toDate = (v: unknown): Date | null => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const mapBill = (snap: QueryDocumentSnapshot<DocumentData>): Bill => {
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data.name ?? ''),
    amount: Number(data.amount ?? 0),
    dueDate: toDate(data.dueDate) ?? new Date(),
    repeat: (data.repeat as BillRepeat) ?? 'none',
    accountId: String(data.accountId ?? ''),
    overrideAccountId: data.overrideAccountId ? String(data.overrideAccountId) : undefined,
    status: (data.status as BillStatus) ?? 'unpaid',
    lastPaidAt: toDate(data.lastPaidAt),
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

const serialize = (b: Bill) => ({
  id: b.id,
  name: b.name,
  amount: b.amount,
  dueDate: b.dueDate.toISOString(),
  repeat: b.repeat,
  accountId: b.accountId,
  overrideAccountId: b.overrideAccountId ?? null,
  status: b.status,
  lastPaidAt: b.lastPaidAt ? b.lastPaidAt.toISOString() : null,
  notes: b.notes ?? null,
  createdAt: b.createdAt ? b.createdAt.toISOString() : null,
  updatedAt: b.updatedAt ? b.updatedAt.toISOString() : null,
});

const deserialize = (raw: any): Bill => ({
  id: String(raw.id),
  name: String(raw.name),
  amount: Number(raw.amount ?? 0),
  dueDate: new Date(raw.dueDate),
  repeat: (raw.repeat as BillRepeat) ?? 'none',
  accountId: String(raw.accountId ?? ''),
  overrideAccountId: raw.overrideAccountId ?? undefined,
  status: (raw.status as BillStatus) ?? 'unpaid',
  lastPaidAt: raw.lastPaidAt ? new Date(raw.lastPaidAt) : null,
  notes: raw.notes ?? undefined,
  createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
  updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
});

export const useBills = (uid: string | undefined) => {
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!uid) return;
    const key = userBillsKey(uid);
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const cached = await getCached<any[]>(key);
        if (!cancelled && cached && Array.isArray(cached)) {
          const restored = cached.map(deserialize);
          setItems(restored);
          setLoading(false);
        }
      } catch {
        // ignore cache read errors
      }

      const q = query(billsRef(uid), orderBy('dueDate'));
      const unsub = onSnapshot(
        q,
        async (snapshot) => {
          const list = snapshot.docs.map(mapBill);
          setItems(list);
          setLoading(false);
          try {
            await setCached(key, list.map(serialize));
          } catch {
            // ignore cache write errors
          }
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      );
      unsubRef.current = unsub;
    })();

    return () => {
      const u = unsubRef.current; u?.(); unsubRef.current = null;
      cancelled = true;
    };
  }, [uid]);

  const addBill = async (input: BillInput) => {
    if (!uid) throw new Error('Missing user session.');
    if (!input.name || !input.accountId) throw new Error('Name and account are required.');
    const payload: Record<string, unknown> = {
      name: input.name,
      amount: Number(input.amount),
      dueDate: input.dueDate,
      repeat: input.repeat ?? 'none',
      accountId: input.accountId,
      overrideAccountId: input.overrideAccountId ?? null,
      status: input.status ?? 'unpaid',
      notes: input.notes ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(billsRef(uid), payload);
  };

  const updateBill = async (id: string, patch: BillPatch) => {
    if (!uid) throw new Error('Missing user session.');
    const ref = doc(db, 'users', uid, 'bills', id);
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.amount !== undefined) payload.amount = Number(patch.amount);
    if (patch.dueDate !== undefined) payload.dueDate = patch.dueDate;
    if (patch.repeat !== undefined) payload.repeat = patch.repeat;
    if (patch.accountId !== undefined) payload.accountId = patch.accountId;
    if (patch.overrideAccountId !== undefined)
      payload.overrideAccountId = patch.overrideAccountId ?? null;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.lastPaidAt !== undefined) payload.lastPaidAt = patch.lastPaidAt;
    if (patch.notes !== undefined) payload.notes = patch.notes ?? null;
    await updateDoc(ref, payload);
  };

  const deleteBill = async (id: string) => {
    if (!uid) throw new Error('Missing user session.');
    const ref = doc(db, 'users', uid, 'bills', id);
    await deleteDoc(ref);
  };

  // Helpers: unpaid in window and due today per account
  const getUnpaidInWindow = (
    accountId: string,
    start: Date,
    end: Date,
  ): number => {
    const total = items.reduce((acc, bill) => {
      const payFrom = bill.overrideAccountId ?? bill.accountId;
      if (payFrom !== accountId) return acc;
      const next = nextOccurrenceOnOrAfter(bill, start);
      if (next && next.getTime() < end.getTime() && (bill.status === 'unpaid' || bill.status === 'scheduled')) {
        return acc + bill.amount;
      }
      return acc;
    }, 0);
    return Number(total.toFixed(2));
  };

  const getDueToday = (accountId: string, today: Date): number => {
    const total = items.reduce((acc, bill) => {
      const payFrom = bill.overrideAccountId ?? bill.accountId;
      if (payFrom !== accountId) return acc;
      const next = nextOccurrenceOnOrAfter(bill, today);
      if (next && isSameDay(next, today) && (bill.status === 'unpaid' || bill.status === 'scheduled')) {
        return acc + bill.amount;
      }
      return acc;
    }, 0);
    return Number(total.toFixed(2));
  };

  return {
    items,
    loading,
    error,
    addBill,
    updateBill,
    deleteBill,
    getUnpaidInWindow,
    getDueToday,
  } as const;
};

// Compute the next due occurrence for a bill on or after a reference date
export const nextOccurrenceOnOrAfter = (bill: Bill, ref: Date): Date | null => {
  const base = bill.dueDate;
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
  if (bill.repeat === 'none') {
    return base.getTime() >= start.getTime() ? base : null;
  }
  if (bill.repeat === 'monthly') {
    const day = base.getDate();
    const d = new Date(start);
    d.setDate(1);
    // candidate in current month
    const candidate = new Date(d.getFullYear(), d.getMonth(), day);
    const cand = candidate.getTime() >= start.getTime() ? candidate : new Date(d.getFullYear(), d.getMonth() + 1, day);
    return cand;
  }
  if (bill.repeat === 'yearly') {
    const month = base.getMonth();
    const day = base.getDate();
    const candidate = new Date(start.getFullYear(), month, day);
    return candidate.getTime() >= start.getTime()
      ? candidate
      : new Date(start.getFullYear() + 1, month, day);
  }
  return null;
};

