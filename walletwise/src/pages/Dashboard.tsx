import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonText,
  IonButtons,
  IonButton,
} from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import { useBills } from '../features/bills/useBills';
import { computeSpendableForAccount } from '../features/spendable/spendable';
import { ProBadge } from '../components/ProBadge';
import { computeRecommendations, getRecsDismissed, setRecsDismissed } from '../features/recs/recommendations';
import { useTxnStore } from '../state/useTxnStore';
import { StatTile } from '../components/ui/StatTile';
import { Money } from '../components/ui/Money';
import { AccountCard } from '../components/ui/AccountCard';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonList';
import { DonutChart } from '../components/ui/DonutChart';
import { LineChart } from '../components/ui/LineChart';
import styles from './Dashboard.module.css';
import { calendarClearOutline, timeOutline, fileTrayFullOutline } from 'ionicons/icons';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const uid = user?.uid;
  const txns = useTxnStore((s) => s.items);
  const { items: accounts, loading: accountsLoading, error: accountsError } = useAccounts(uid, { isPro: false });
  const { items: bills, loading: billsLoading, error: billsError } = useBills(uid);
  const [recsDismissed, setDismissedState] = React.useState<boolean>(false);
  const [month] = React.useState<Date>(() => new Date());
  React.useEffect(() => { (async () => {
    const key = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;
    setDismissedState(await getRecsDismissed(key));
  })(); }, [month]);

  const recs = React.useMemo(() => computeRecommendations(new Date(), txns, accounts, bills), [txns, accounts, bills]);
  const hasRecs = recs.length > 0;
  const monthKey = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;
  const dismissRecs = async () => { await setRecsDismissed(monthKey, true); setDismissedState(true); };
  const restoreRecs = async () => { await setRecsDismissed(monthKey, false); setDismissedState(false); };

  // Range filters and aggregates
  type RangeKey = 'thisMonth' | 'thisWeek' | 'lastMonth' | 'custom';
  const [range, setRange] = React.useState<RangeKey>('thisMonth');
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfWeek = (d: Date) => { const s = new Date(d); const dow = s.getDay(); s.setDate(s.getDate() - dow); s.setHours(0,0,0,0); return s; };
  const endOfWeek = (d: Date) => { const e = startOfWeek(d); e.setDate(e.getDate() + 6); e.setHours(23,59,59,999); return e; };
  const today = new Date();
  const currentRange = React.useMemo(() => {
    if (range === 'thisWeek') return { start: startOfWeek(today), end: endOfWeek(today) } as const;
    if (range === 'lastMonth') { const m = new Date(today.getFullYear(), today.getMonth() - 1, 1); return { start: startOfMonth(m), end: endOfMonth(m) } as const; }
    return { start: startOfMonth(today), end: endOfMonth(today) } as const; // default + custom fallback
  }, [range]);
  const inRange = (d: Date) => d.getTime() >= currentRange.start.getTime() && d.getTime() <= currentRange.end.getTime();
  const rangedTxns = React.useMemo(() => txns.filter((t) => inRange(t.date)), [txns, currentRange]);
  const rangeIncome = rangedTxns.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const rangeExpense = rangedTxns.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const rangeNet = rangeIncome - rangeExpense;
  const catTotals = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const t of rangedTxns) { if (t.type !== 'expense') continue; const k = t.category || 'Uncategorized'; m.set(k, (m.get(k) ?? 0) + t.amount); }
    return Array.from(m.entries()).map(([category, total]) => ({ category, total })).sort((a,b)=>b.total-a.total).slice(0,6);
  }, [rangedTxns]);
  const donutData = catTotals.map((c, i) => ({ label: c.category, value: Number(c.total.toFixed(2)), color: ['#3b82f6','#f59e0b','#ef4444','#10b981','#8b5cf6','#06b6d4'][i%6] }));
  const trend = React.useMemo(() => {
    const labels: string[] = []; const values: number[] = [];
    const d = new Date(currentRange.start); const end = currentRange.end; d.setHours(0,0,0,0);
    while (d <= end) { labels.push(`${d.getMonth()+1}/${d.getDate()}`); const total = rangedTxns.filter((t)=>t.type==='expense' && t.date.toDateString()===d.toDateString()).reduce((a,b)=>a+b.amount,0); values.push(Number(total.toFixed(2))); d.setDate(d.getDate()+1); }
    return { labels, values };
  }, [rangedTxns, currentRange]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><ProBadge /></IonButtons>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {hasRecs && !recsDismissed ? (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Recommendations</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recs.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <IonBadge color={r.severity === 'danger' ? 'danger' : r.severity === 'warning' ? 'warning' : 'medium'}>{r.type.replace('-', ' ')}</IonBadge>
                    <span>{r.message}</span>
                  </div>
                ))}
              </div>
              <IonButton size="small" fill="outline" className="ion-margin-top" onClick={dismissRecs}>Dismiss</IonButton>
            </IonCardContent>
          </IonCard>
        ) : null}
        {hasRecs && recsDismissed ? (
          <IonButton size="small" fill="clear" onClick={restoreRecs}>Show Recommendations</IonButton>
        ) : null}

        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className={styles.chipTabs}>
              {[
                { key: 'thisMonth', label: 'This Month' },
                { key: 'thisWeek', label: 'This Week' },
                { key: 'lastMonth', label: 'Last Month' },
                { key: 'custom', label: 'Custom' },
              ].map((tab) => (
                <button key={tab.key} className={range === (tab.key as any) ? 'active' : ''} onClick={() => setRange(tab.key as any)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <IonButton routerLink="/transactions/new" color="primary">Add Transaction</IonButton>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          <StatTile icon={calendarClearOutline} label="Total Income" value={<Money value={rangeIncome} />} tone="success" />
          <StatTile icon={fileTrayFullOutline} label="Total Expenses" value={<Money value={rangeExpense} />} tone="danger" />
          <StatTile icon={timeOutline} label="Net Savings" value={<Money value={Math.abs(rangeNet)} signed type={rangeNet >= 0 ? 'income' : 'expense'} />} tone={rangeNet >= 0 ? 'success' : 'danger'} />
        </div>

        <IonGrid className={styles.sectionCard}>
          <IonRow>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Spending by Category</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {donutData.length === 0 ? (
                    <IonText color="medium"><p>No expenses in this range.</p></IonText>
                  ) : (
                    <>
                      <DonutChart data={donutData} />
                      <div className={styles.categoryLegend}>
                        {donutData.map((d) => (
                          <span key={d.label}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, background: d.color, borderRadius: 10, marginRight: 6 }} />
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Spending Trend</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {trend.values.length === 0 ? (
                    <IonText color="medium"><p>No expenses in this range.</p></IonText>
                  ) : (
                    <LineChart labels={trend.labels} values={trend.values} height={220} />
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        {accountsError ? <ErrorBanner message={accountsError} /> : null}
        {billsError ? <ErrorBanner message={billsError} /> : null}

        {(accountsLoading || billsLoading) ? (
          <SkeletonList count={3} />
        ) : accounts.length === 0 ? (
          <EmptyState title="No accounts" message="Add an account to see insights here." />
        ) : (
          <IonGrid className={styles.accountsSection}>
            <IonRow>
              {accounts.map((a) => {
                const s = computeSpendableForAccount(a, bills);
                const status: 'default' | 'success' | 'warning' | 'danger' = s.safeToSpend < 0
                  ? 'danger'
                  : s.obligationsWindow > s.safeToSpend
                    ? 'warning'
                    : 'success';
                return (
                  <IonCol size="12" sizeMd="6" sizeLg="4" key={a.id}>
                    <AccountCard
                      name={a.name}
                      type={a.type}
                      safeToSpend={s.safeToSpend}
                      balance={a.balanceCurrent}
                      obligations={s.obligationsWindow}
                      status={status}
                    />
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
        )}

        <IonCard className={styles.sectionCard}>
          <IonCardHeader>
            <IonCardTitle>Recent Transactions</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {txns.slice(0, 6).map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ion-color-step-100, #eee)' }}>
                <div>
                  <strong>{t.category}{t.subcategory ? ` / ${t.subcategory}` : ''}</strong>
                  <div style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>{t.date.toLocaleDateString()}</div>
                </div>
                <div>
                  <Money value={Math.abs(t.amount)} signed type={t.type === 'income' ? 'income' : 'expense'} />
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <IonButton fill="clear" routerLink="/ledger">Load More Transactions</IonButton>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

