import React, { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonNote,
  IonText,
  IonToast,
} from '@ionic/react';
import type { Transaction } from '../types/transaction';
import { formatDateTime, formatSignedAmount } from '../utils/format';
import { useTxnStore } from '../state/useTxnStore';
import { TxnModal } from './TxnModal';
import { IonIcon } from '@ionic/react';
import { createOutline } from 'ionicons/icons';

interface TxnDetailsModalProps {
  isOpen: boolean;
  transaction?: Transaction;
  onDismiss: () => void;
  // Legacy callbacks are intentionally optional and no longer required.
  onEdit?: (txn: Transaction) => void;
  onDelete?: (txn: Transaction) => void;
}

export const TxnDetailsModal: React.FC<TxnDetailsModalProps> = ({ isOpen, transaction, onDismiss }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' | 'medium' } | null>(null);

  const setStoreError = useTxnStore((s) => s.setError);

  const handleEdit = () => {
    if (!transaction) return;
    setIsEditing(true);
  };

  if (!transaction) {
    return (
      <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={onDismiss}>Close</IonButton>
            </IonButtons>
            <IonTitle>Transaction</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p>No transaction selected.</p>
          </IonText>
        </IonContent>
      </IonModal>
    );
  }

  const amountClass = transaction.type === 'income' ? 'txn-amount income' : 'txn-amount expense';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} breakpoints={[0, 0.5, 0.8]} initialBreakpoint={0.8}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
          <IonTitle>Transaction Details</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleEdit} aria-label="Edit">
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList inset>
          <IonItem>
            <IonLabel>
              <h3>Type</h3>
              <p>{transaction.type === 'income' ? 'Income' : 'Expense'}</p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Amount</h3>
              <p>
                <IonNote className={amountClass}>
                  {formatSignedAmount(transaction.type, transaction.amount)}
                </IonNote>
              </p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Category</h3>
              <p>{transaction.category}</p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Date & Time</h3>
              <p>{formatDateTime(transaction.date)}</p>
            </IonLabel>
          </IonItem>
          {transaction.note ? (
            <IonItem>
              <IonLabel>
                <h3>Note</h3>
                <p>{transaction.note}</p>
              </IonLabel>
            </IonItem>
          ) : null}
        </IonList>
      </IonContent>
      <TxnModal
        isOpen={isEditing}
        mode="edit"
        transaction={transaction}
        onDismiss={() => setIsEditing(false)}
        onSuccess={(message) => {
          setIsEditing(false);
          setStoreError(null);
          setToast({ message: message || 'Transaction updated', color: 'success' });
          if ((message || '').toLowerCase().includes('deleted')) {
            onDismiss();
          }
        }}
        onError={(message) => {
          setToast({ message: message || 'Failed to update transaction', color: 'danger' });
        }}
      />
      <IonToast
        isOpen={toast !== null}
        message={toast?.message}
        color={toast?.color}
        duration={2200}
        position="bottom"
        onDidDismiss={() => setToast(null)}
      />
    </IonModal>
  );
};
