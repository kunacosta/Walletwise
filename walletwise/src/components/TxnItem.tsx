import React from 'react';
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/react';
import { arrowUpCircleOutline, arrowDownCircleOutline, cloudUploadOutline } from 'ionicons/icons';
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

  const title = transaction.category;

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
      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {transaction.pending ? (
          <IonIcon
            icon={cloudUploadOutline}
            color="warning"
            aria-label="Pending sync"
            title="Pending sync"
            style={{ fontSize: 18 }}
          />
        ) : null}
        <IonNote className={amountClass}>
          {formatSignedAmount(transaction.type, transaction.amount)}
        </IonNote>
      </div>
    </IonItem>
  );
};
