import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Account } from '../../types/account';
import { getCached, setCached } from '../../lib/cache';
import { userAccountsKey } from '../../constants/cacheKeys';

type AccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>;
type AccountPatch = Partial<AccountInput>;

const accountsRef = (uid: string) => collection(db, 'users', uid, 'accounts');

const mapAccount = (snap: QueryDocumentSnapshot<DocumentData>): Account => {
  const data = snap.data();
  const created = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
  const updated = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;
  return {
    id: snap.id,
    name: String(data.name ?? ''),
    type: data.type as Account['type'],
    institution: data.institution ? String(data.institution) : undefined,
    numberMasked: data.numberMasked ? String(data.numberMasked) : undefined,
    balanceCurrent: Number(data.balanceCurrent ?? 0),
    creditLimit: data.creditLimit != null ? Number(data.creditLimit) : undefined,
    createdAt: created,
    updatedAt: updated,
  };
};

const serialize = (a: Account) => ({
  ...a,
  createdAt: a.createdAt ? a.createdAt.toISOString() : null,
  updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
});

const deserialize = (raw: any): Account => ({
  id: String(raw.id),
  name: String(raw.name),
  type: raw.type,
  institution: raw.institution ?? undefined,
  numberMasked: raw.numberMasked ?? undefined,
  balanceCurrent: Number(raw.balanceCurrent ?? 0),
  creditLimit: raw.creditLimit != null ? Number(raw.creditLimit) : undefined,
  createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
  updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
});

export const useAccounts = (uid: string | undefined, opts?: { isPro?: boolean }) => {
  const isPro = opts?.isPro ?? false;
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const maxFreeReached = useMemo(() => !isPro && items.length >= 5, [isPro, items.length]);
  const canCreate = !maxFreeReached;
  const createDisabledReason = maxFreeReached ? 'Free limit reached (5). Upgrade to Pro.' : null;

  // Hydrate from cache and subscribe
  useEffect(() => {
    if (!uid) return;

    const key = userAccountsKey(uid);
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

      const q = query(accountsRef(uid), orderBy('name'));
      const unsub = onSnapshot(
        q,
        async (snapshot) => {
          const list = snapshot.docs.map(mapAccount);
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
      cancelled = true;
      const u = unsubRef.current;
      u?.();
      unsubRef.current = null;
    };
  }, [uid]);

  const addAccount = useCallback(
    async (input: AccountInput) => {
      if (!uid) throw new Error('Missing user session.');
      if (!input.name || !input.type) throw new Error('Name and type are required.');
      if (!(input.balanceCurrent >= 0 || input.balanceCurrent <= 0)) input.balanceCurrent = 0;
      const payload: Record<string, unknown> = {
        name: input.name,
        type: input.type,
        institution: input.institution ?? null,
        numberMasked: input.numberMasked ?? null,
        balanceCurrent: Number(input.balanceCurrent),
        creditLimit: input.creditLimit ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(accountsRef(uid), payload);
    },
    [uid],
  );

  const updateAccount = useCallback(
    async (id: string, patch: AccountPatch) => {
      if (!uid) throw new Error('Missing user session.');
      const ref = doc(db, 'users', uid, 'accounts', id);
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.type !== undefined) payload.type = patch.type;
      if (patch.institution !== undefined) payload.institution = patch.institution ?? null;
      if (patch.numberMasked !== undefined) payload.numberMasked = patch.numberMasked ?? null;
      if (patch.balanceCurrent !== undefined)
        payload.balanceCurrent = Number(patch.balanceCurrent);
      if (patch.creditLimit !== undefined) payload.creditLimit = patch.creditLimit ?? null;
      await updateDoc(ref, payload);
    },
    [uid],
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      if (!uid) throw new Error('Missing user session.');
      const ref = doc(db, 'users', uid, 'accounts', id);
      await deleteDoc(ref);
    },
    [uid],
  );

  return {
    items,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    canCreate,
    maxFreeReached,
    createDisabledReason,
  } as const;
};

