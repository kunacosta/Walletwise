import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { Category, CategoryType } from '../../types/category';
import { getCached, setCached } from '../../lib/cache';
import { userCategoriesKey } from '../../constants/cacheKeys';

type CategoryInput = {
  name: string;
  type: CategoryType;
  subcategories?: string[];
  isSystem?: boolean;
};
type CategoryPatch = Partial<Omit<CategoryInput, 'type'>> & { type?: CategoryType };

const categoriesRef = (uid: string) => collection(db, 'users', uid, 'categories');
const txnsRef = (uid: string) => collection(db, 'users', uid, 'transactions');

const toDate = (v: unknown): Date | null => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const mapCategory = (snap: QueryDocumentSnapshot<DocumentData>): Category => {
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data.name ?? ''),
    type: (data.type as CategoryType) ?? 'expense',
    subcategories: Array.isArray(data.subcategories) ? (data.subcategories as string[]) : [],
    isSystem: Boolean(data.isSystem),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

const serialize = (c: Category) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  subcategories: c.subcategories ?? [],
  isSystem: Boolean(c.isSystem),
  createdAt: c.createdAt ? c.createdAt.toISOString() : null,
  updatedAt: c.updatedAt ? c.updatedAt.toISOString() : null,
});

const deserialize = (raw: any): Category => ({
  id: String(raw.id),
  name: String(raw.name),
  type: raw.type as CategoryType,
  subcategories: Array.isArray(raw.subcategories) ? raw.subcategories : [],
  isSystem: Boolean(raw.isSystem),
  createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
  updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
});

export const CATEGORY_DEFAULTS: Array<Omit<Category, 'id'>> = [
  // Expenses
  {
    name: 'Food & Drinks',
    type: 'expense',
    isSystem: true,
    subcategories: ['Meals', 'Snacks', 'Groceries', 'Coffee/Tea', 'Dining Out'],
  },
  {
    name: 'Transport',
    type: 'expense',
    isSystem: true,
    subcategories: ['Petrol', 'Parking', 'Tolls', 'Public Transport', 'E-hailing'],
  },
  {
    name: 'Home & Utilities',
    type: 'expense',
    isSystem: true,
    subcategories: ['Rent', 'Electricity', 'Water', 'Internet', 'Maintenance'],
  },
  {
    name: 'Shopping',
    type: 'expense',
    isSystem: true,
    subcategories: ['Clothing', 'Accessories', 'Electronics', 'Household Items'],
  },
  {
    name: 'Health',
    type: 'expense',
    isSystem: true,
    subcategories: ['Clinic', 'Pharmacy', 'Supplements', 'Insurance (Medical)'],
  },
  {
    name: 'Entertainment',
    type: 'expense',
    isSystem: true,
    subcategories: ['Movies', 'Gaming', 'Streaming Subscriptions', 'Events/Concerts'],
  },
  {
    name: 'Education',
    type: 'expense',
    isSystem: true,
    subcategories: ['Tuition', 'Books', 'Online Courses', 'Software Tools'],
  },
  {
    name: 'Personal Care',
    type: 'expense',
    isSystem: true,
    subcategories: ['Haircut', 'Skincare', 'Grooming', 'Fitness/Gym'],
  },
  {
    name: 'Bills',
    type: 'expense',
    isSystem: true,
    subcategories: ['Mobile Plan', 'Subscriptions', 'Insurance', 'Loan Payment'],
  },
  // Income
  {
    name: 'Salary',
    type: 'income',
    isSystem: true,
    subcategories: ['Main Job', 'Overtime', 'Bonus'],
  },
  {
    name: 'Business',
    type: 'income',
    isSystem: true,
    subcategories: ['Sales', 'Client Payments'],
  },
  {
    name: 'Investments',
    type: 'income',
    isSystem: true,
    subcategories: ['Dividends', 'Trading Profit', 'Staking/Interest'],
  },
  {
    name: 'Others',
    type: 'income',
    isSystem: true,
    subcategories: ['Cashback', 'Gifts', 'Refunds'],
  },
  {
    name: 'Savings & Goals',
    type: 'income',
    isSystem: true,
    subcategories: ['Emergency Fund', 'Car Savings', 'Vacation Fund', 'House Deposit'],
  },
  {
    name: 'Transfers',
    type: 'income',
    isSystem: true,
    subcategories: ['To Bank', 'From Bank', 'To eWallet', 'From eWallet'],
  },
];

export const useCategories = (uid: string | undefined) => {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);
  const seededRef = useRef<boolean>(false);

  useEffect(() => {
    if (!uid) return;
    const key = userCategoriesKey(uid);
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
      } catch {}

      const q = query(categoriesRef(uid), orderBy('type'), orderBy('name'));
      const unsub = onSnapshot(
        q,
        async (snapshot) => {
          const list = snapshot.docs.map(mapCategory);
          setItems(list);
          setLoading(false);

          // Seed defaults only on first run if empty
          if (!seededRef.current && list.length === 0) {
            try {
              seededRef.current = true;
              for (const d of CATEGORY_DEFAULTS) {
                await addDoc(categoriesRef(uid), {
                  name: d.name,
                  type: d.type,
                  subcategories: d.subcategories ?? [],
                  isSystem: true,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
            } catch (e) {
              // ignore seeding errors
            }
            return; // wait for next snapshot to persist cache
          }

          try {
            await setCached(key, list.map(serialize));
          } catch {}
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

  const addCategory = async (input: CategoryInput) => {
    if (!uid) throw new Error('Missing user session.');
    if (!input.name || !input.type) throw new Error('Name and type are required.');
    await addDoc(categoriesRef(uid), {
      name: input.name,
      type: input.type,
      subcategories: input.subcategories ?? [],
      isSystem: Boolean(input.isSystem),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateCategory = async (id: string, patch: CategoryPatch) => {
    if (!uid) throw new Error('Missing user session.');
    const ref = doc(db, 'users', uid, 'categories', id);
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.type !== undefined) payload.type = patch.type;
    if (patch.subcategories !== undefined) payload.subcategories = patch.subcategories ?? [];
    await updateDoc(ref, payload);
  };

  const countTransactionsUsingCategory = async (categoryName: string): Promise<number> => {
    if (!uid) return 0;
    const q = query(txnsRef(uid), where('category', '==', categoryName));
    const snaps = await getDocs(q);
    return snaps.size;
  };

  const reassignTransactions = async (oldName: string, newName: string): Promise<number> => {
    if (!uid) return 0;
    const q = query(txnsRef(uid), where('category', '==', oldName));
    const snaps = await getDocs(q);
    let count = 0;
    for (const docSnap of snaps.docs) {
      const ref = doc(db, 'users', uid, 'transactions', docSnap.id);
      await updateDoc(ref, { category: newName, updatedAt: serverTimestamp() });
      count++;
    }
    return count;
  };

  const deleteCategory = async (id: string, opts?: { reassignToName?: string; categoryName?: string }) => {
    if (!uid) throw new Error('Missing user session.');
    const cat = items.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found.');
    if (cat.isSystem) throw new Error('System categories cannot be deleted.');
    const name = opts?.categoryName ?? cat.name;
    const refs = await countTransactionsUsingCategory(name);
    if (refs > 0) {
      if (!opts?.reassignToName) {
        throw new Error(`Category is used by ${refs} transactions. Reassign before deleting.`);
      }
      await reassignTransactions(name, opts.reassignToName);
    }
    const ref = doc(db, 'users', uid, 'categories', id);
    await deleteDoc(ref);
  };

  return {
    items,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    countTransactionsUsingCategory,
    reassignTransactions,
  } as const;
};
