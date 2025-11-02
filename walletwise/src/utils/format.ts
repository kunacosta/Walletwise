import type { Transaction, TransactionType } from '../types/transaction';

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export const formatMonthYear = (date: Date): string => monthFormatter.format(date);

export const formatDayLabel = (date: Date): string => dayFormatter.format(date);

export const formatTime = (date: Date): string => timeFormatter.format(date);

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

export const formatSignedAmount = (type: TransactionType, amount: number): string => {
  const formatted = formatCurrency(amount);
  return type === 'expense' ? `-${formatted}` : `+${formatted}`;
};

export const getDayKey = (date: Date): string => {
  const iso = date.toISOString();
  return iso.slice(0, 10);
};

export const isSameMonth = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

export const computeSummary = (transactions: Transaction[]) => {
  return transactions.reduce(
    (acc, txn) => {
      if (txn.type === 'income') {
        acc.income += txn.amount;
      } else {
        acc.expense += txn.amount;
      }
      acc.net = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, net: 0 },
  );
};
