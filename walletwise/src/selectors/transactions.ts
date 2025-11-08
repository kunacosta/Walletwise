import type { Transaction } from '../types/transaction';
import { getDayKey, isSameMonth } from '../utils/format';

export const transactionsForMonth = (items: Transaction[], month: Date): Transaction[] =>
  items.filter((t) => isSameMonth(t.date, month));

export const sumsForMonth = (items: Transaction[], month: Date) => {
  const txns = transactionsForMonth(items, month);
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount; else expense += t.amount;
  }
  return { income, expense, net: income - expense };
};

export const groupExpensesByCategory = (items: Transaction[], month: Date) => {
  const map = new Map<string, number>();
  for (const t of items) {
    if (t.type !== 'expense') continue;
    if (!isSameMonth(t.date, month)) continue;
    const key = t.category || 'Uncategorized';
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
};

export const groupExpensesBySubcategory = (items: Transaction[], month: Date, category: string) => {
  const map = new Map<string, number>();
  for (const t of items) {
    if (t.type !== 'expense') continue;
    if (!isSameMonth(t.date, month)) continue;
    if ((t.category || 'Uncategorized') !== category) continue;
    const key = t.subcategory || 'General';
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([subcategory, total]) => ({ subcategory, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
};

export const dailyExpenseStats = (items: Transaction[], month: Date) => {
  const totals = new Map<string, number>();
  let daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (const t of items) {
    if (t.type !== 'expense') continue;
    if (!isSameMonth(t.date, month)) continue;
    const key = getDayKey(t.date);
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  const daysWithSpend = Array.from(totals.values()).filter((v) => v > 0).length;
  const noSpendDays = Math.max(0, daysInMonth - daysWithSpend);
  const totalExpense = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  const avgDailySpend = daysWithSpend > 0 ? Number((totalExpense / daysWithSpend).toFixed(2)) : 0;
  return { daysInMonth, daysWithSpend, noSpendDays, avgDailySpend };
};

