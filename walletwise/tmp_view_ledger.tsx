import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonText,
  IonList,
  IonSpinner,
  IonFab,
  IonFabButton,
  IonIcon,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
} from '@ionic/react';
import { addOutline, settingsOutline } from 'ionicons/icons';
import { useIonAlert } from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { useTxnStore } from '../state/useTxnStore';
import type { Transaction } from '../types/transaction';
import { DaySection } from '../components/DaySection';
import { TxnModal } from '../components/TxnModal';
import { deleteTransaction } from '../services/db';
import { ProBadge } from '../components/ProBadge';
import {
  computeSummary,
  formatCurrency,
  formatMonthYear,
  getDayKey,
  isSameMonth,
} from '../utils/format';

interface ToastState {
  message: string;
  color: 'success' | 'danger' | 'medium';
}

export const Ledger: React.FC = () => {
  const { user } = useAuthStore();
  const items = useTxnStore((state) => state.items);
  const loading = useTxnStore((state) => state.loading);
  const error = useTxnStore((state) => state.error);
  const subscribe = useTxnStore((state) => state.subscribe);
  const setStoreError = useTxnStore((state) => state.setError);
  const addLocal = useTxnStore((state) => state.addLocal);
  const removeLocal = useTxnStore((state) => state.removeLocal);

  const [currentMonth] = useState(() => new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [presentAlert] = useIonAlert();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [q, setQ] = useState('');
  console.log('Ledger renders', { hasUser: Boolean(user), txnCount: items.length, loading });

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribe(user.uid);
    return () => {
      unsubscribe?.();
    };
  }, [user?.uid, subscribe]);

  useEffect(() => {
    if (error) {
      setToast({ message: error, color: 'danger' });
    }
  }, [error]);

  const monthlyTransactions = useMemo(() => {
    let list = items.filter((txn) => isSameMonth(txn.date, currentMonth));
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((t) =>
        (t.category?.toLowerCase().includes(needle)) ||
        (t.subcategory?.toLowerCase().includes(needle)) ||
        ((t.note ?? '').toLowerCase().includes(needle))
      );
    }
    return list;
  }, [items, currentMonth, filter, q]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, { date: Date; items: Transaction[] }>();
    monthlyTransactions.forEach((txn) => {
      const key = getDayKey(txn.date);
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(txn);
      } else {
        groups.set(key, { date: txn.date, items: [txn] });
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [monthlyTransactions]);

  const summary = useMemo(() => computeSummary(monthlyTransactions), [monthlyTransactions]);

  const handleAddClick = () => {
    setEditingTransaction(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (txn: Transaction) => {
    setEditingTransaction(txn);
    setIsModalOpen(true);
  };

  const handleDelete = (txn: Transaction) => {
    presentAlert({
      header: 'Delete Transaction',
      message: `Delete ${txn.category} for ${formatCurrency(txn.amount)}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            removeLocal(txn.id);
            try {
              await deleteTransaction(txn.id);
              setStoreError(null);
              setToast({ message: 'Transaction deleted', color: 'success' });
            } catch (err) {
              addLocal(txn);
              const message =
                err instanceof Error ? err.message : 'Failed to delete transaction.';
              setStoreError(message);
              setToast({ message, color: 'danger' });
            }
          },
        },
      ],
    });
  };

  const handleModalDismiss = () => {
    setIsModalOpen(false);
    setEditingTransaction(undefined);
  };

  const handleModalSuccess = (message: string) => {
    setStoreError(null);
    setToast({ message, color: 'success' });
  };

  const handleModalError = (message: string) => {
    setToast({ message, color: 'danger' });
  };

  const hasTransactions = groupedTransactions.length > 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><ProBadge /></IonButtons>
          <IonTitle>{formatMonthYear(currentMonth)} Ledger</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/settings">
              <IonIcon slot="icon-only" icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div className="ion-margin-bottom">
          <IonSegment value={filter} onIonChange={(e) => setFilter((e.detail.value as any) ?? 'all')}>
            <IonSegmentButton value="all">All</IonSegmentButton>
            <IonSegmentButton value="income">Income</IonSegmentButton>
            <IonSegmentButton value="expense">Expense</IonSegmentButton>
          </IonSegment>
          <IonSearchbar
            className="search-compact"
            value={q}
            onIonInput={(e) => setQ(e.detail.value ?? '')}
            placeholder="Search category, subcategory, note"
            aria-label="Search transactions"
          />
        </div>
        <IonGrid className="summary-grid">
          <IonRow>
            <IonCol>
              <IonText color="success">
                <h3>Income</h3>
                <p className="summary-value">+{formatCurrency(summary.income)}</p>
              </IonText>
            </IonCol>
            <IonCol>
              <IonText color="danger">
                <h3>Expense</h3>
                <p className="summary-value">-{formatCurrency(summary.expense)}</p>
              </IonText>
            </IonCol>
            <IonCol>
              <IonText color={summary.net >= 0 ? 'success' : 'danger'}>
                <h3>Net</h3>
                <p className="summary-value">
                  {summary.net >= 0
                    ? `+${formatCurrency(summary.net)}`
                    : `-${formatCurrency(Math.abs(summary.net))}`}
                </p>
              </IonText>
            </IonCol>
          </IonRow>
        </IonGrid>

        {loading ? (
          <div className="ledger-loading">
            <IonSpinner name="crescent" />
            <IonText>
              <p>Loading transactions...</p>
            </IonText>
          </div>
        ) : null}

        {!loading && !hasTransactions ? (
          <div className="ledger-empty">
            <IonText color="medium">
              <h2>No transactions yet</h2>
              <p>Tap the add button to record your first transaction.</p>
            </IonText>
          </div>
        ) : null}

        {hasTransactions ? (
          <IonList inset>
            {groupedTransactions.map((group) => (
              <DaySection
                key={getDayKey(group.date)}
                date={group.date}
                items={group.items}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </IonList>
        ) : null}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton color="primary" onClick={handleAddClick}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <TxnModal
          isOpen={isModalOpen}
          mode={editingTransaction ? 'edit' : 'create'}
          transaction={editingTransaction}
          onDismiss={handleModalDismiss}
          onSuccess={handleModalSuccess}
          onError={handleModalError}
        />

        <IonToast
          isOpen={toast !== null}
          message={toast?.message}
          color={toast?.color}
          duration={2500}
          position="bottom"
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

