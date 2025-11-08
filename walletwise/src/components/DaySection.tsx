import React from 'react';
import { IonListHeader, IonNote } from '@ionic/react';
import type { Transaction } from '../types/transaction';
import { formatCurrency, formatDayLabel } from '../utils/format';
import { TxnItem } from './TxnItem';

interface DaySectionProps {
  date: Date;
  items: Transaction[];
  onView: (transaction: Transaction) => void;
}

export const DaySection: React.FC<DaySectionProps> = ({ date, items, onView }) => {
  const totals = items.reduce(
    (acc, txn) => {
      if (txn.type === 'income') {
        acc += txn.amount;
      } else {
        acc -= txn.amount;
      }
      return acc;
    },
    0,
  );

  const totalClass = totals >= 0 ? 'day-total income' : 'day-total expense';
  const formattedTotal =
    totals >= 0 ? `+${formatCurrency(totals)}` : `-${formatCurrency(Math.abs(totals))}`;

  return (
    <>
      <IonListHeader lines="full">
        <div className="day-header">
          <div>
            <h2>{formatDayLabel(date)}</h2>
            <p>{items.length === 1 ? '1 transaction' : `${items.length} transactions`}</p>
          </div>
          <IonNote className={totalClass}>{formattedTotal}</IonNote>
        </div>
      </IonListHeader>
      {items.map((item) => (
        <TxnItem key={item.id} transaction={item} onView={onView} />
      ))}
    </>
  );
};
