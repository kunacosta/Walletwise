import React from 'react';
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/react';
import { arrowUpCircleOutline, arrowDownCircleOutline } from 'ionicons/icons';
import type { Transaction } from '../types/transaction';
import { formatSignedAmount, formatTime } from '../utils/format';

interface TxnItemProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

export const TxnItem: React.FC<TxnItemProps> = ({ transaction, onView }) => {
  const handleView = () => {
    onView(transaction);
  };

  const amountClass = transaction.type === 'income' ? 'txn-amount income' : 'txn-amount expense';

  const title = transaction.subcategory
    ? `${transaction.category} - ${transaction.subcategory}`
    : transaction.category;

  return (
    <IonItem button onClick={handleView} detail lines="full">
      <IonIcon
        slot="start"
        icon={transaction.type === 'income' ? arrowUpCircleOutline : arrowDownCircleOutline}
        color={transaction.type === 'income' ? 'success' : 'danger'}
      />
      <IonLabel>
        <h3>{title}</h3>
        <p className="txn-meta">{formatTime(transaction.date)}</p>
        {transaction.note ? <p className="txn-note">{transaction.note}</p> : null}
      </IonLabel>
      <IonNote slot="end" className={amountClass}>
        {formatSignedAmount(transaction.type, transaction.amount)}
      </IonNote>
    </IonItem>
  );
};
