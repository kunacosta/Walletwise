import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonText,
  IonList,
  IonSpinner,
  IonFab,
  IonFabButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { addOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
// import { useIonAlert } from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { useTxnStore } from '../state/useTxnStore';
import type { Transaction } from '../types/transaction';
import { DaySection } from '../components/DaySection';
import { TxnDetailsModal } from '../components/TxnDetailsModal';
// Delete/edit are now handled inside TxnDetailsModal
import { ProBadge } from '../components/ProBadge';
import { PageHeader } from '../components/PageHeader';
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

export const Transactions: React.FC = () => {
  const { user } = useAuthStore();
  const history = useHistory();
  const items = useTxnStore((state) => state.items);
  const loading = useTxnStore((state) => state.loading);
  const error = useTxnStore((state) => state.error);
  const subscribe = useTxnStore((state) => state.subscribe);
  // const addLocal = useTxnStore((state) => state.addLocal);
  // const removeLocal = useTxnStore((state) => state.removeLocal);

  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  // const [presentAlert] = useIonAlert();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [q, setQ] = useState('');
  console.log('Transactions renders', { hasUser: Boolean(user), txnCount: items.length, loading });

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

  const prevMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleAddClick = () => {
    history.push('/transactions/new');
  };

  const handleView = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setIsDetailsOpen(true);
  };

  // Edit and Delete now handled inside TxnDetailsModal

  const hasTransactions = groupedTransactions.length > 0;

  return (
    <IonPage>
      <PageHeader
        title="Transactions"
        subtitle={formatMonthYear(currentMonth)}
        start={<ProBadge />}
      />
      <IonContent fullscreen className="app-content">
        {/* Pull to refresh to re-subscribe */}
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            if (user?.uid) {
              const unsub = subscribe(user.uid);
              setTimeout(() => {
                unsub?.();
                (e as any).detail.complete();
              }, 600);
            } else {
              setTimeout(() => (e as any).detail.complete(), 300);
            }
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
        <section className="header-gradient">
          <div className="h1">{formatMonthYear(currentMonth)}</div>
          <p className="body">Filter, search, and review every move.</p>
          <div className="stats-row">
            <IonChip color="success">Income&nbsp;{formatCurrency(summary.income)}</IonChip>
            <IonChip color="danger">Expense&nbsp;{formatCurrency(summary.expense)}</IonChip>
            <IonChip color={summary.net >= 0 ? 'success' : 'danger'}>
              Net&nbsp;{summary.net >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(summary.net))}
            </IonChip>
          </div>
        </section>

        <div className="section-stack">
          <IonCard>
            <IonCardContent>
              <div className="month-nav-card">
                <IonButton onClick={prevMonth} aria-label="Previous month" fill="outline">
                  <IonIcon slot="icon-only" icon={chevronBackOutline} />
                </IonButton>
                <div className="month-nav-card__label">{formatMonthYear(currentMonth)}</div>
                <IonButton onClick={nextMonth} aria-label="Next month" fill="outline">
                  <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Filters</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonSegment value={filter} onIonChange={(e) => setFilter((e.detail.value as any) ?? 'all')}>
                <IonSegmentButton value="all">All</IonSegmentButton>
                <IonSegmentButton value="income">Income</IonSegmentButton>
                <IonSegmentButton value="expense">Expense</IonSegmentButton>
              </IonSegment>
              <IonSearchbar
                className="search-compact"
                value={q}
                onIonInput={(e) => setQ(e.detail.value ?? '')}
                debounce={250}
                animated
                placeholder="Search category, note"
                aria-label="Search transactions"
              />
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Summary</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="summary-grid">
                <div>
                  <h3>Income</h3>
                  <p className="summary-value value-positive">+{formatCurrency(summary.income)}</p>
                </div>
                <div>
                  <h3>Expense</h3>
                  <p className="summary-value value-negative">-{formatCurrency(summary.expense)}</p>
                </div>
                <div>
                  <h3>Net</h3>
                  <p className="summary-value">
                    {summary.net >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(summary.net))}
                  </p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

        </div>

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
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Transactions</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList inset={false}>
                {groupedTransactions.map((group) => (
                  <DaySection
                    key={getDayKey(group.date)}
                    date={group.date}
                    items={group.items}
                    onView={handleView}
                  />
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        ) : null}

        <IonFab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          style={{ bottom: 'calc(var(--ion-safe-area-bottom, 0px) + 16px)' } as React.CSSProperties}
        >
          <IonFabButton color="primary" onClick={handleAddClick} aria-label="Add transaction">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>


        <TxnDetailsModal
          isOpen={isDetailsOpen}
          transaction={selectedTransaction ?? undefined}
          onDismiss={() => setIsDetailsOpen(false)}
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
