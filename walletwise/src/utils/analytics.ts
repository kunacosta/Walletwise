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

// aggregateBySubcategory has been deprecated in favor of category-only views.
