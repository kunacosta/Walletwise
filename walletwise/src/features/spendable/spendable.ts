import type { Account } from '../../types/account';
import type { Bill } from '../../types/bill';
import { useSettings } from '../../state/settings';
import { nextOccurrenceOnOrAfter } from '../bills/useBills';

export interface SpendableInputs {
  holdsToday?: number; // pending holds clearing today
  holdsWindow?: number; // pending holds clearing within window
  earmarks?: number; // manual earmarks/reserved funds
  now?: Date;
}

export interface SpendableResult {
  spendableNow: number;
  safeToSpend: number;
  dueToday: number;
  obligationsWindow: number;
}

export const computeSpendableForAccount = (
  account: Account,
  bills: Bill[],
  opts?: SpendableInputs,
): SpendableResult => {
  const { spendWindowDays, bufferMode, bufferValue, bufferPercent } = useSettings.getState();
  const now = opts?.now ?? new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + spendWindowDays);

  const effectiveAccountId = (b: Bill) => b.overrideAccountId ?? b.accountId;

  const dueToday = bills.reduce((acc, b) => {
    if (effectiveAccountId(b) !== account.id) return acc;
    const next = nextOccurrenceOnOrAfter(b, now);
    if (!next) return acc;
    const sameDay =
      next.getFullYear() === now.getFullYear() &&
      next.getMonth() === now.getMonth() &&
      next.getDate() === now.getDate();
    if (sameDay && (b.status === 'unpaid' || b.status === 'scheduled')) acc += b.amount;
    return acc;
  }, 0);

  const obligationsWindow = bills.reduce((acc, b) => {
    if (effectiveAccountId(b) !== account.id) return acc;
    const next = nextOccurrenceOnOrAfter(b, now);
    if (!next) return acc;
    if (next.getTime() < end.getTime() && (b.status === 'unpaid' || b.status === 'scheduled')) acc += b.amount;
    return acc;
  }, 0);

  const holdsToday = opts?.holdsToday ?? 0;
  const holdsWindow = opts?.holdsWindow ?? 0;
  const earmarks = opts?.earmarks ?? 0;
  const buffer = bufferMode === 'fixed' ? bufferValue : bufferMode === 'percent' ? (account.balanceCurrent * (bufferPercent / 100)) : 0;

  const spendableNow = Number((account.balanceCurrent - holdsToday - dueToday).toFixed(2));
  const safeToSpend = Number((account.balanceCurrent - obligationsWindow - holdsWindow - earmarks - buffer).toFixed(2));

  return { spendableNow, safeToSpend, dueToday, obligationsWindow };
};

export const aggregateSafeToSpend = (
  accounts: Account[],
  bills: Bill[],
  includeCredit: boolean,
): number => {
  const filtered = includeCredit ? accounts : accounts.filter((a) => a.type !== 'credit');
  const total = filtered.reduce((acc, a) => acc + computeSpendableForAccount(a, bills).safeToSpend, 0);
  return Number(total.toFixed(2));
};

export const canCoverBill = (
  account: Account,
  bill: Bill,
  bills: Bill[],
): boolean => {
  const { safeToSpend } = computeSpendableForAccount(account, bills);
  return safeToSpend - bill.amount >= 0;
};
