import React from 'react';
import { formatCurrency, formatSignedAmount } from '../../utils/format';

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
  return <span className={className}>{text}</span>;
};

