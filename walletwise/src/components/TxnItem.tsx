import React, { useRef } from 'react';
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonNote,
} from '@ionic/react';
import { arrowUpCircleOutline, arrowDownCircleOutline } from 'ionicons/icons';
import type { Transaction } from '../types/transaction';
import { formatSignedAmount, formatTime } from '../utils/format';

interface TxnItemProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const TxnItem: React.FC<TxnItemProps> = ({ transaction, onEdit, onDelete }) => {
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null);

  const closeSliding = async () => {
    const el = slidingRef.current;
    if (el) {
      await el.closeOpened();
    }
  };

  const handleEdit = async () => {
    await closeSliding();
    onEdit(transaction);
  };

  const handleDelete = async () => {
    await closeSliding();
    onDelete(transaction);
  };

  const amountClass = transaction.type === 'income' ? 'txn-amount income' : 'txn-amount expense';

  const title = transaction.subcategory
    ? `${transaction.category} - ${transaction.subcategory}`
    : transaction.category;

  return (
    <IonItemSliding ref={slidingRef}>
      <IonItem detail={false} lines="full">
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
      <IonItemOptions side="end">
        <IonItemOption color="primary" onClick={handleEdit} expandable>
          Edit
        </IonItemOption>
        <IonItemOption color="danger" onClick={handleDelete} expandable>
          Delete
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
};
