import type { Transaction } from '../types/transaction';

export const aggregateByCategory = (txns: Transaction[]): Array<{ category: string; total: number }> => {
  const map = new Map<string, number>();
  for (const t of txns) {
    const key = t.category || 'Uncategorized';
    const sign = t.type === 'expense' ? -1 : 1;
    map.set(key, (map.get(key) ?? 0) + sign * t.amount);
  }
  return Array.from(map.entries()).map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }));
};

export const aggregateBySubcategory = (
  txns: Transaction[],
): Array<{ category: string; subcategory: string; total: number }> => {
  const map = new Map<string, number>();
  for (const t of txns) {
    const cat = t.category || 'Uncategorized';
    const sub = t.subcategory || 'General';
    const key = `${cat}::${sub}`;
    const sign = t.type === 'expense' ? -1 : 1;
    map.set(key, (map.get(key) ?? 0) + sign * t.amount);
  }
  return Array.from(map.entries()).map(([key, total]) => {
    const [category, subcategory] = key.split('::');
    return { category, subcategory, total: Number(total.toFixed(2)) };
  });
};

