import React from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
} from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import { useBills } from '../features/bills/useBills';
import { computeSpendableForAccount } from '../features/spendable/spendable';
import { ProBadge } from '../components/ProBadge';
import { OfflineBadge } from '../components/OfflineBadge';
import { PageHeader } from '../components/PageHeader';
import { computeRecommendations, getRecsDismissed, setRecsDismissed } from '../features/recs/recommendations';
import { useTxnStore } from '../state/useTxnStore';
import { StatTile } from '../components/ui/StatTile';
import { Money } from '../components/ui/Money';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonList';
import { DonutChart } from '../components/ui/DonutChart';
import { LineChart } from '../components/ui/LineChart';
import styles from './Dashboard.module.css';
import {
  calendarClearOutline,
  timeOutline,
  fileTrayFullOutline,
  walletOutline,
} from 'ionicons/icons';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const uid = user?.uid;
  const txns = useTxnStore((s) => s.items);
  const { items: accounts, loading: accountsLoading, error: accountsError } = useAccounts(uid, { isPro: false });
  const { items: bills, loading: billsLoading, error: billsError } = useBills(uid);
  const [recsDismissed, setDismissedState] = React.useState<boolean>(false);
  const [month] = React.useState<Date>(() => new Date());
  React.useEffect(() => { (async () => {
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    setDismissedState(await getRecsDismissed(key));
  })(); }, [month]);

  const recs = React.useMemo(() => computeRecommendations(new Date(), txns, accounts, bills), [txns, accounts, bills]);
  const hasRecs = recs.length > 0;
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const dismissRecs = async () => { await setRecsDismissed(monthKey, true); setDismissedState(true); };
  const restoreRecs = async () => { await setRecsDismissed(monthKey, false); setDismissedState(false); };

  type RangeKey = 'thisMonth' | 'thisWeek' | 'lastMonth' | 'custom';
  const [range, setRange] = React.useState<RangeKey>('thisMonth');
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfWeek = (d: Date) => { const s = new Date(d); const dow = s.getDay(); s.setDate(s.getDate() - dow); s.setHours(0, 0, 0, 0); return s; };
  const endOfWeek = (d: Date) => { const e = startOfWeek(d); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return e; };
  const today = new Date();
  const currentRange = React.useMemo(() => {
    if (range === 'thisWeek') return { start: startOfWeek(today), end: endOfWeek(today) } as const;
    if (range === 'lastMonth') { const m = new Date(today.getFullYear(), today.getMonth() - 1, 1); return { start: startOfMonth(m), end: endOfMonth(m) } as const; }
    return { start: startOfMonth(today), end: endOfMonth(today) } as const;
  }, [range]);
  const inRange = (d: Date) => d.getTime() >= currentRange.start.getTime() && d.getTime() <= currentRange.end.getTime();
  const rangedTxns = React.useMemo(() => txns.filter((t) => inRange(t.date)), [txns, currentRange]);
  const rangeIncome = rangedTxns.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const rangeExpense = rangedTxns.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const rangeNet = rangeIncome - rangeExpense;
  const catTotals = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const t of rangedTxns) {
      if (t.type !== 'expense') continue;
      const k = t.category || 'Uncategorized';
      m.set(k, (m.get(k) ?? 0) + t.amount);
    }
    return Array.from(m.entries()).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [rangedTxns]);
  const donutData = catTotals.map((c, i) => ({ label: c.category, value: Number(c.total.toFixed(2)), color: ['#7c68ff', '#f5a524', '#ec4899', '#0fa67f', '#38bdf8', '#c084fc'][i % 6] }));
  const trend = React.useMemo(() => {
    const labels: string[] = []; const values: number[] = [];
    const d = new Date(currentRange.start); const end = currentRange.end; d.setHours(0, 0, 0, 0);
    while (d <= end) {
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      const total = rangedTxns
        .filter((t) => t.type === 'expense' && t.date.toDateString() === d.toDateString())
        .reduce((a, b) => a + b.amount, 0);
      values.push(Number(total.toFixed(2)));
      d.setDate(d.getDate() + 1);
    }
    return { labels, values };
  }, [rangedTxns, currentRange]);

  const heroName = (user?.displayName?.split(' ')[0] || '').trim() || 'friend';
  const rangeLabel = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return `${fmt.format(currentRange.start)} – ${fmt.format(currentRange.end)}`;
  }, [currentRange]);
  const totalSafe = React.useMemo(() => accounts.reduce((sum, account) => {
    const { safeToSpend } = computeSpendableForAccount(account, bills);
    return sum + safeToSpend;
  }, 0), [accounts, bills]);
  const recentTxns = React.useMemo(() => txns.slice(0, 6), [txns]);
  const donutTotal = donutData.reduce((sum, slice) => sum + slice.value, 0);

  const rangeCopy: Record<RangeKey, string> = {
    thisMonth: 'This month',
    thisWeek: 'This week',
    lastMonth: 'Last month',
    custom: 'Custom range',
  };

  return (
    <IonPage>
      <PageHeader
        title="Dashboard"
        subtitle="Command Center"
        start={<ProBadge />}
        end={<OfflineBadge />}
      />
      <IonContent fullscreen className="app-content">
        <section className="header-gradient">
          <div className="h1">Welcome back, {heroName}</div>
          <p className="body">Designing wealth with intention.</p>
          <div className="stats-row">
            <IonChip color="success">
              Net flow&nbsp;
              <Money value={Math.abs(rangeNet)} signed type={rangeNet >= 0 ? 'income' : 'expense'} />
            </IonChip>
            <IonChip color="medium">{rangeLabel}</IonChip>
            <IonChip color="medium">Safe to spend&nbsp;<Money value={totalSafe} /></IonChip>
          </div>
          <div className="header-actions">
            <IonButton color="primary" routerLink="/transactions/new">Add transaction</IonButton>
            <IonButton fill="outline" routerLink="/calendar">View calendar</IonButton>
          </div>
        </section>

        <div className="section-stack">
          {hasRecs && !recsDismissed ? (
            <IonCard aria-live="polite">
              <IonCardHeader className="section-title-row">
                <IonCardTitle>Intelligent nudges</IonCardTitle>
                <IonButton size="small" fill="outline" onClick={dismissRecs}>Dismiss</IonButton>
              </IonCardHeader>
              <IonCardContent className={styles.recs}>
                {recs.map((r) => (
                  <div key={r.id} className={styles.recsRow}>
                    <IonBadge color={r.severity === 'danger' ? 'danger' : r.severity === 'warning' ? 'warning' : 'medium'}>
                      {r.type.replace('-', ' ')}
                    </IonBadge>
                    <span>{r.message}</span>
                  </div>
                ))}
              </IonCardContent>
            </IonCard>
          ) : null}
          {hasRecs && recsDismissed ? (
            <IonButton size="small" fill="outline" onClick={restoreRecs}>Show recommendations</IonButton>
          ) : null}

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Money pulse</IonCardTitle>
              <IonSegment
                value={range}
                onIonChange={(e) => setRange(((e.detail.value as RangeKey) ?? 'thisMonth'))}
                scrollable
              >
                <IonSegmentButton value="thisMonth">
                  <IonLabel>This Month</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="thisWeek">
                  <IonLabel>This Week</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="lastMonth">
                  <IonLabel>Last Month</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonCardHeader>
            <IonCardContent>
              <div className="metrics-grid">
                <StatTile icon={timeOutline} label="Cash in" value={<Money value={rangeIncome} />} tone="success" />
                <StatTile icon={calendarClearOutline} label="Spent" value={<Money value={rangeExpense} />} tone="danger" />
                <StatTile
                  icon={fileTrayFullOutline}
                  label="Net position"
                  value={<Money value={Math.abs(rangeNet)} signed type={rangeNet >= 0 ? 'income' : 'expense'} />}
                  tone={rangeNet >= 0 ? 'success' : 'danger'}
                />
                <StatTile
                  icon={walletOutline}
                  label="Safe to spend"
                  value={<Money value={Math.abs(totalSafe)} signed type={totalSafe >= 0 ? 'income' : 'expense'} />}
                />
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Top categories</IonCardTitle>
              <IonBadge color="medium">{rangeLabel}</IonBadge>
            </IonCardHeader>
            <IonCardContent>
              {donutTotal <= 0 ? (
                <div className={styles.chartEmpty}>No expenses in this range.</div>
              ) : (
                <div className={styles.donutArea}>
                  <div className="chart-wrapper">
                    <DonutChart data={donutData} />
                  </div>
                  <div className={styles.legendList}>
                    {catTotals.map((row, i) => (
                      <div key={row.category} className={styles.legendRow}>
                        <span className={styles.legendSwatch} style={{ backgroundColor: donutData[i].color }} aria-hidden />
                        <span>{row.category}</span>
                        <span className={styles.legendAmount}><Money value={row.total} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Daily burn</IonCardTitle>
              <IonBadge color="medium">{rangeCopy[range]}</IonBadge>
            </IonCardHeader>
            <IonCardContent>
              {trend.values.length === 0 ? (
                <div className={styles.chartEmpty}>No activity captured.</div>
              ) : (
                <div className="chart-wrapper">
                  <LineChart labels={trend.labels} values={trend.values} height={260} />
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Accounts overview</IonCardTitle>
              <IonButton size="small" fill="outline" routerLink="/accounts">Manage</IonButton>
            </IonCardHeader>
            <IonCardContent>
              {accountsError ? <ErrorBanner message={accountsError} /> : null}
              {billsError ? <ErrorBanner message={billsError} /> : null}
              {(accountsLoading || billsLoading) ? (
                <SkeletonList count={3} />
              ) : accounts.length === 0 ? (
                <EmptyState title="No accounts yet" message="Track at least one account to unlock spend forecasts." />
              ) : (
                <div className="stack-gap">
                  {accounts.map((a) => {
                    const s = computeSpendableForAccount(a, bills);
                    const status: 'default' | 'success' | 'warning' | 'danger' = s.safeToSpend < 0
                      ? 'danger'
                      : s.obligationsWindow > s.safeToSpend
                        ? 'warning'
                        : 'success';
                    return (
                      <div key={a.id} className="list-row">
                        <div>
                          <div className="h2" style={{ color: 'var(--ion-text-color)' }}>{a.name}</div>
                          <div className="body">{a.type}</div>
                        </div>
                        <div className="ion-text-right">
                          <Money value={a.balanceCurrent} />
                          <div className="body">
                            Safe&nbsp;
                            <Money value={Math.abs(s.safeToSpend)} signed type={s.safeToSpend >= 0 ? 'income' : 'expense'} />
                          </div>
                          {(status === 'danger' || status === 'warning') && (
                            <IonBadge color={status}>
                              {status.toUpperCase()}
                            </IonBadge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Recent activity</IonCardTitle>
              <IonButton size="small" fill="outline" routerLink="/transactions">View transactions</IonButton>
            </IonCardHeader>
            <IonCardContent>
              {recentTxns.length === 0 ? (
                <div className={styles.chartEmpty}>Add your first transaction to start the story.</div>
              ) : (
                <div className={styles.txnList}>
                  {recentTxns.map((t) => (
                    <div key={t.id} className={styles.txnRow}>
                      <div>
                        <div className={styles.txnCategory}>
                          {t.category}
                        </div>
                        <div className={styles.txnMeta}>{t.date.toLocaleDateString()}</div>
                      </div>
                      <Money value={Math.abs(t.amount)} signed type={t.type === 'income' ? 'income' : 'expense'} />
                    </div>
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};
