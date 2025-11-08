import React from 'react';
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
  IonFooter,
} from '@ionic/react';
import type { Transaction } from '../types/transaction';
import { formatDateTime, formatSignedAmount } from '../utils/format';

interface TxnDetailsModalProps {
  isOpen: boolean;
  transaction?: Transaction;
  onDismiss: () => void;
  onEdit?: (txn: Transaction) => void;
  onDelete?: (txn: Transaction) => void;
}

export const TxnDetailsModal: React.FC<TxnDetailsModalProps> = ({ isOpen, transaction, onDismiss, onEdit, onDelete }) => {
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
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} breakpoints={[0, 0.5, 0.8]} initialBreakpoint={0.5}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
          <IonTitle>Transaction Details</IonTitle>
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
              <h3>Subcategory</h3>
              <p>{transaction.subcategory}</p>
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
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton fill="outline" color="danger" onClick={() => transaction && onDelete?.(transaction)}>
              Delete
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => transaction && onEdit?.(transaction)}>
              Edit
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};
