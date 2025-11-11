import React from 'react';
import { formatCurrency, formatSignedAmount } from '../../utils/format';
import styles from './Money.module.css';

interface MoneyProps {
  value: number;
  signed?: boolean;
  type?: 'income' | 'expense' | 'neutral';
  className?: string;
}

export const Money: React.FC<MoneyProps> = ({ value, signed = false, type = 'neutral', className }) => {
  const text = signed && (type === 'income' || type === 'expense')
    ? formatSignedAmount(type, Math.abs(value))
    : formatCurrency(value);

  const classes = [styles.money];

  if (type === 'income') classes.push(styles.income);
  if (type === 'expense') classes.push(styles.expense);
  if (className) classes.push(className);

  return <span className={classes.join(' ')}>{text}</span>;
};

