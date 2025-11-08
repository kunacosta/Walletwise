import { getCached, setCached } from '../../lib/cache';
import { formatMonthYear } from '../../utils/format';
import type { Transaction } from '../../types/transaction';
import type { Account } from '../../types/account';
import type { Bill } from '../../types/bill';
import { computeSpendableForAccount } from '../spendable/spendable';

export type RecSeverity = 'info' | 'warning' | 'danger';

export interface Recommendation {
  id: string;
  type: 'budget-drift' | 'category-spike' | 'low-spendable';
  message: string;
  severity: RecSeverity;
}

const recsDismissedKey = (monthKey: string) => `walletwise:v1:recs:dismissed:${monthKey}`;

export const getRecsDismissed = async (monthKey: string): Promise<boolean> => {
  const v = await getCached<boolean>(recsDismissedKey(monthKey));
  return Boolean(v);
};

export const setRecsDismissed = async (monthKey: string, dismissed: boolean): Promise<void> => {
  await setCached(recsDismissedKey(monthKey), dismissed);
};

const yyyymm = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const computeRecommendations = (
  month: Date,
  txns: Transaction[],
  accounts: Account[],
  bills: Bill[],
): Recommendation[] => {
  const now = new Date();
  // month boundaries
  const mEnd = endOfMonth(month);
  const daysInMonth = mEnd.getDate();
  const daysElapsed = Math.min(daysInMonth, isSameMonth(now, month) ? now.getDate() : daysInMonth);
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const inMonth = (t: Transaction) => isSameMonth(t.date, month);
  const lastMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const inLastMonth = (t: Transaction) => isSameMonth(t.date, lastMonth);

  const mtdExpense = txns.filter((t) => t.type === 'expense' && inMonth(t))
    .filter((t) => !isSameMonth(now, month) || t.date.getDate() <= now.getDate())
    .reduce((acc, t) => acc + t.amount, 0);
  const lastMonthExpense = txns.filter((t) => t.type === 'expense' && inLastMonth(t))
    .reduce((acc, t) => acc + t.amount, 0);

  const recs: Recommendation[] = [];

  // 1) Budget drift (using last month's total expense as proxy budget)
  if (lastMonthExpense > 0 && daysElapsed > 0) {
    const projectedAllowed = (lastMonthExpense * (daysElapsed / daysInMonth));
    if (mtdExpense > projectedAllowed) {
      const remainingBudget = Math.max(0, lastMonthExpense - mtdExpense);
      const cap = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
      recs.push({
        id: `budget-${yyyymm(month)}`,
        type: 'budget-drift',
        severity: 'warning',
        message: `You are outpacing your ${formatMonthYear(lastMonth)} budget. Cap daily spend to ${cap.toFixed(2)} for the rest of the month.`,
      });
    }
  }

  // 2) Category spike (> +50% vs last month, min threshold 50)
  const catSum = (filterFn: (t: Transaction) => boolean) => {
    const map = new Map<string, number>();
    for (const t of txns) {
      if (!filterFn(t)) continue;
      const key = t.category || 'Uncategorized';
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return map;
  };
  const thisCat = catSum((t) => t.type === 'expense' && inMonth(t));
  const lastCat = catSum((t) => t.type === 'expense' && inLastMonth(t));
  for (const [cat, cur] of thisCat.entries()) {
    const prev = lastCat.get(cat) ?? 0;
    if (prev <= 0) continue;
    if (cur >= prev * 1.5 && cur - prev >= 50) {
      recs.push({
        id: `spike-${yyyymm(month)}-${cat}`,
        type: 'category-spike',
        severity: 'info',
        message: `Spending in ${cat} is up +${Math.round(((cur - prev) / prev) * 100)}% vs last month. Consider tightening this category.`,
      });
    }
  }

  // 3) Low spendable: if any account safeToSpend < 0, propose moving funds
  const perAccount = accounts.map((a) => ({ acc: a, s: computeSpendableForAccount(a, bills) }));
  const negatives = perAccount.filter((x) => x.s.safeToSpend < 0).sort((a, b) => a.s.safeToSpend - b.s.safeToSpend);
  const positives = perAccount.filter((x) => x.s.safeToSpend > 0).sort((a, b) => b.s.safeToSpend - a.s.safeToSpend);
  if (negatives.length > 0 && positives.length > 0) {
    const need = Math.abs(negatives[0].s.safeToSpend);
    const donor = positives[0].acc.name;
    const receiver = negatives[0].acc.name;
    recs.push({
      id: `move-${yyyymm(month)}-${receiver}`,
      type: 'low-spendable',
      severity: 'danger',
      message: `Low safe-to-spend in ${receiver}. Consider moving around ${need.toFixed(2)} from ${donor}.`,
    });
  }

  return recs;
};
