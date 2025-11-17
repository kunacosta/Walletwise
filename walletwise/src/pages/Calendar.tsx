import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardContent,
  IonBadge,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonModal,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonRippleEffect,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, addOutline } from 'ionicons/icons';
import { useAuthStore } from '../state/useAuthStore';
import { useTxnStore } from '../state/useTxnStore';
import { useBills, nextOccurrenceOnOrAfter } from '../features/bills/useBills';
import type { Transaction } from '../types/transaction';
import { isSameMonth } from '../utils/format';
import { isSameDay, startOfMonth, endOfMonth } from '../lib/date';
import { useSettings } from '../state/settings';
import { formatCurrency, formatDayLabel, formatMonthYear } from '../utils/format';
// Add Transaction now uses a full page
import { ProBadge } from '../components/ProBadge';
import { Money } from '../components/ui/Money';
import styles from './Calendar.module.css';
import { useHistory } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

interface DayInfo {
  date: Date;
  inMonth: boolean;
  net: number; // income - expense for that day
  incomeTotal: number;
  expenseTotal: number;
  billsDue: number; // total due amount that day (all accounts)
  txns: Transaction[];
  tone: 'none' | 'surplus' | 'deficit';
}

type BillWithNext = ReturnType<typeof useBills>['items'][number] & { next: Date };

const buildMonthGrid = (month: Date, txns: Transaction[], bills: ReturnType<typeof useBills>['items'], firstDayOfWeek: 0 | 1): DayInfo[] => {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const start = new Date(first);
  const dow = first.getDay();
  const offset = (7 + (dow - firstDayOfWeek)) % 7;
  start.setDate(first.getDate() - offset);
  const end = new Date(last);
  const lastDow = last.getDay();
  const tail = (6 - ((7 + (lastDow - firstDayOfWeek)) % 7));
  end.setDate(last.getDate() + tail);

  const days: DayInfo[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const dayTxns = txns.filter((t) => isSameDay(t.date, day));
    const incomeTotal = dayTxns.reduce((acc, t) => (t.type === 'income' ? acc + t.amount : acc), 0);
    const expenseTotal = dayTxns.reduce((acc, t) => (t.type === 'expense' ? acc + t.amount : acc), 0);
    const net = incomeTotal - expenseTotal;
    const tone: DayInfo['tone'] =
      net > 0 ? 'surplus' : net < 0 ? 'deficit' : 'none';
    // Bills due that day (sum amounts for bills whose next occurrence equals day)
    const billsDue = bills.reduce((acc, b) => {
      const next = nextOccurrenceOnOrAfter(b, day);
      const due = next && isSameDay(next, day) && (b.status === 'unpaid' || b.status === 'scheduled');
      return due ? acc + b.amount : acc;
    }, 0);
    days.push({
      date: day,
      inMonth: isSameMonth(day, month),
      net,
      incomeTotal,
      expenseTotal,
      billsDue,
      txns: dayTxns,
      tone,
    });
  }
  return days;
};

export const Calendar: React.FC = () => {
  const { user } = useAuthStore();
  const uid = user?.uid;
  const items = useTxnStore((s) => s.items);
  const subscribe = useTxnStore((s) => s.subscribe);
  const { items: bills } = useBills(uid);
  const firstDayOfWeek = useSettings((s) => s.firstDayOfWeek);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayOpen, setIsDayOpen] = useState(false);
  const history = useHistory();

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribe(uid);
    return () => { unsub?.(); };
  }, [uid, subscribe]);

  const monthlyTransactions = useMemo(
    () => items.filter((t) => isSameMonth(t.date, currentMonth)),
    [items, currentMonth],
  );

  const summary = useMemo(() => {
    return monthlyTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount; else acc.expense += t.amount;
        acc.net = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, net: 0 },
    );
  }, [monthlyTransactions]);

  const grid = useMemo(() => buildMonthGrid(currentMonth, items, bills, firstDayOfWeek), [currentMonth, items, bills, firstDayOfWeek]);

  const upcomingBills = useMemo<BillWithNext[]>(() => {
    const now = new Date();
    return bills
      .map((bill) => {
        const next = nextOccurrenceOnOrAfter(bill, now);
        if (!next || (bill.status !== 'unpaid' && bill.status !== 'scheduled')) {
          return null;
        }
        return { ...bill, next } as BillWithNext;
      })
      .filter((b): b is BillWithNext => b !== null)
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 4);
  }, [bills]);

  const openDay = (day: Date) => {
    setSelectedDay(day);
    setIsDayOpen(true);
  };

  const closeDay = () => {
    setIsDayOpen(false);
    setSelectedDay(null);
  };

  const prevMonth = () => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(d);
  };

  const dayTxns = useMemo(() => {
    if (!selectedDay) return [] as Transaction[];
    return items
      .filter((t) => isSameDay(t.date, selectedDay))
      .slice()
      .sort((a, b) => {
        const aTime = (a.createdAt ?? a.date).getTime();
        const bTime = (b.createdAt ?? b.date).getTime();
        return aTime - bTime;
      });
  }, [items, selectedDay]);

  const dayBills = useMemo(() => {
    if (!selectedDay) return [];
    return bills.filter((b) => {
      const next = nextOccurrenceOnOrAfter(b, selectedDay);
      return next && isSameDay(next, selectedDay) && (b.status === 'unpaid' || b.status === 'scheduled');
    });
  }, [bills, selectedDay]);

  const dayIncomeTotal = dayTxns.reduce(
    (acc, t) => (t.type === 'income' ? acc + t.amount : acc),
    0,
  );
  const dayExpenseTotal = dayTxns.reduce(
    (acc, t) => (t.type === 'expense' ? acc + t.amount : acc),
    0,
  );
  const dayNetTotal = dayIncomeTotal - dayExpenseTotal;
  const dayTone: 'none' | 'surplus' | 'deficit' =
    dayNetTotal > 0 ? 'surplus' : dayNetTotal < 0 ? 'deficit' : 'none';
  const hasDayActivity = dayTxns.length > 0 || dayBills.length > 0;

  const today = new Date();

  return (
    <IonPage>
      <PageHeader
        title="Calendar"
        subtitle={formatMonthYear(currentMonth)}
        start={<ProBadge />}
      />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Plan the month</div>
          <p className="body">Align cash flow with bills and recurring activity.</p>
          <div className="stats-row">
            <IonChip color="success">Income {formatCurrency(summary.income)}</IonChip>
            <IonChip color="danger">Expense {formatCurrency(summary.expense)}</IonChip>
            <IonChip color={summary.net >= 0 ? 'success' : 'danger'}>
              Net {summary.net >= 0 ? '+' : '-'}
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
              <IonCardTitle>Calendar</IonCardTitle>
            </IonCardHeader>
            <IonCardContent className={styles.calendarCard}>
              <div className={styles.dayList} role="list">
                {grid.filter((cell) => cell.inMonth).map((cell) => {
                  const isToday = isSameDay(cell.date, today);
                  const visibleTxns = cell.txns.slice(0, 2);
                  const weekdayLabel = cell.date.toLocaleDateString(undefined, { weekday: 'short' });
                  const toneClass =
                    cell.tone === 'surplus'
                      ? styles.dayCardToneSurplus
                      : cell.tone === 'deficit'
                      ? styles.dayCardToneDeficit
                      : styles.dayCardToneNeutral;
                  const classes = [
                    styles.dayCard,
                    toneClass,
                    isToday ? styles.dayCardToday : '',
                    'ion-activatable',
                    'ripple-parent',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const labelParts: string[] = [];
                  labelParts.push(formatDayLabel(cell.date));
                  if (cell.incomeTotal > 0) {
                    labelParts.push(`Income ${formatCurrency(cell.incomeTotal)}`);
                  }
                  if (cell.expenseTotal > 0) {
                    labelParts.push(`Expense ${formatCurrency(cell.expenseTotal)}`);
                  }
                  if (cell.net !== 0) {
                    labelParts.push(`Net ${cell.net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(cell.net))}`);
                  }
                  if (cell.billsDue > 0) {
                    labelParts.push(`Bills ${formatCurrency(cell.billsDue)}`);
                  }
                  if (cell.txns.length > 0) {
                    labelParts.push(`${cell.txns.length} transaction${cell.txns.length > 1 ? 's' : ''}`);
                  } else {
                    labelParts.push('No activity');
                  }
                  const ariaLabel = labelParts.join(', ');
                    return (
                      <button
                        key={cell.date.toISOString()}
                      type="button"
                      className={classes}
                      onClick={() => openDay(cell.date)}
                      aria-label={ariaLabel}
                        title={ariaLabel}
                        role="listitem"
                      >
                        <div className={styles.dayHeader}>
                          <div className={styles.dayHeaderMain}>
                            <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                            <span className={styles.weekday}>{weekdayLabel}</span>
                          </div>
                          {isToday ? <span className={styles.todayPill}>Today</span> : null}
                        </div>
                        <div className={styles.daySummaryRow}>
                          <div className={styles.daySummaryGroup}>
                            <span className={styles.summaryLabel}>Income</span>
                            <span className={styles.summaryValuePositive}>
                              {formatCurrency(cell.incomeTotal)}
                            </span>
                          </div>
                          <div className={styles.daySummaryGroup}>
                            <span className={styles.summaryLabel}>Expense</span>
                            <span className={styles.summaryValueNegative}>
                              {formatCurrency(cell.expenseTotal)}
                            </span>
                          </div>
                          <div className={styles.daySummaryGroup}>
                            <span className={styles.summaryLabel}>Transactions</span>
                            <span className={styles.summaryValueNeutral}>
                              {cell.txns.length}
                            </span>
                          </div>
                        </div>
                        <div className={styles.dayHighlights}>
                          {cell.billsDue > 0 ? (
                            <IonBadge className={styles.inlineBadge} color="warning">
                              Bills {formatCurrency(cell.billsDue)}
                            </IonBadge>
                        ) : null}
                      </div>
                      <div className={styles.activityChips}>
                        {cell.txns.length === 0 ? (
                          <span className={styles.emptyHint}>No activity</span>
                        ) : (
                          <>
                            {visibleTxns.map((txn) => (
                              <span
                                key={txn.id}
                                className={`${styles.activityChip} ${txn.type === 'income' ? styles.activityChipIncome : styles.activityChipExpense}`}
                              >
                                {txn.category ?? txn.note ?? txn.type}
                              </span>
                            ))}
                            {cell.txns.length > visibleTxns.length ? (
                              <span className={styles.activityChipMore}>
                                +{cell.txns.length - visibleTxns.length} more
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                      <IonRippleEffect />
                    </button>
                  );
                })}
              </div>
              <div className="calendar-legend" aria-hidden="true">
                <span>Green net = cash in</span>
                <span>Red net = cash out</span>
                <span>Yellow badge = bills due</span>
              </div>
            </IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Upcoming schedule</IonCardTitle>
              <IonChip color="warning">{upcomingBills.length ? `${upcomingBills.length} due soon` : 'Nothing due'}</IonChip>
            </IonCardHeader>
            <IonCardContent>
              {upcomingBills.length === 0 ? (
                <p className="body">No scheduled bills in the next few weeks.</p>
              ) : (
                <IonList inset lines="none">
                  {upcomingBills.map((bill) => (
                    <IonItem key={bill.id} button detail={false} onClick={() => openDay(bill.next)}>
                      <IonLabel>
                        <h3>{bill.name}</h3>
                        <p>Due {formatDayLabel(bill.next)}</p>
                      </IonLabel>
                      <IonBadge slot="end" color="warning">
                        {formatCurrency(bill.amount)}
                      </IonBadge>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        <IonModal
          isOpen={isDayOpen}
          onDidDismiss={closeDay}
          breakpoints={[0, 0.5, 0.95]}
          initialBreakpoint={0.95}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedDay ? formatDayLabel(selectedDay) : 'Day'}</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={() => {
                    if (selectedDay) {
                      history.push(`/transactions/new?date=${selectedDay.toISOString()}`);
                      setIsDayOpen(false);
                    }
                  }}
                >
                  <IonIcon slot="start" icon={addOutline} />
                  Add Transaction
                </IonButton>
                <IonButton onClick={closeDay}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <section className={styles.dayModalSummary}>
              <div className={styles.dayModalHeader}>
                <h2 className={styles.dayModalTitle}>
                  {selectedDay ? formatDayLabel(selectedDay) : 'Day summary'}
                </h2>
                <span
                  className={[
                    styles.dayModalTone,
                    dayTone === 'surplus'
                      ? styles.dayModalToneSurplus
                      : dayTone === 'deficit'
                      ? styles.dayModalToneDeficit
                      : styles.dayModalToneNeutral,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {!hasDayActivity
                    ? 'No activity'
                    : dayTone === 'surplus'
                    ? 'Surplus day'
                    : dayTone === 'deficit'
                    ? 'Deficit day'
                    : 'Balanced day'}
                </span>
              </div>
              <div className={styles.dayModalTotals} aria-label="Day totals">
                <div className={styles.totalPill}>
                  <span className={styles.totalLabel}>Income</span>
                  <span className={styles.totalValuePositive}>
                    {formatCurrency(dayIncomeTotal)}
                  </span>
                </div>
                <div className={styles.totalPill}>
                  <span className={styles.totalLabel}>Expense</span>
                  <span className={styles.totalValueNegative}>
                    {formatCurrency(dayExpenseTotal)}
                  </span>
                </div>
                <div className={styles.totalPill}>
                  <span className={styles.totalLabel}>Net</span>
                  <span
                    className={
                      dayNetTotal > 0
                        ? styles.totalValuePositive
                        : dayNetTotal < 0
                        ? styles.totalValueNegative
                        : styles.totalValueNeutral
                    }
                  >
                    {formatCurrency(dayNetTotal)}
                  </span>
                </div>
              </div>
              <p className={styles.dayModalMeta}>
                {hasDayActivity
                  ? `${dayTxns.length} transaction${dayTxns.length !== 1 ? 's' : ''} • ${dayBills.length} bill${dayBills.length !== 1 ? 's' : ''} due`
                  : 'No activity recorded for this day.'}
              </p>
            </section>

            <IonList inset>
              <IonListHeader>Transactions</IonListHeader>
              {dayTxns.length === 0 ? (
                <IonItem>
                  <IonLabel>No transactions</IonLabel>
                </IonItem>
              ) : (
                dayTxns.map((t) => (
                  <IonItem key={t.id}>
                    <IonLabel>
                      <h3>{t.category}</h3>
                      {t.note ? <p>{t.note}</p> : null}
                    </IonLabel>
                    <IonBadge slot="end" color={t.type === 'income' ? 'success' : 'danger'}>
                      <Money value={Math.abs(t.amount)} signed type={t.type === 'income' ? 'income' : 'expense'} />
                    </IonBadge>
                  </IonItem>
                ))
              )}
            </IonList>

            <IonList inset className="ion-margin-top">
              <IonListHeader>Bills Due</IonListHeader>
              {dayBills.length === 0 ? (
                <IonItem>
                  <IonLabel>No bills due</IonLabel>
                </IonItem>
              ) : (
                dayBills.map((b) => (
                  <IonItem key={b.id}>
                    <IonLabel>
                      <h3>{b.name}</h3>
                      <p>{b.repeat}</p>
                    </IonLabel>
                    <IonBadge slot="end" color="warning">{formatCurrency(b.amount)}</IonBadge>
                  </IonItem>
                ))
              )}
            </IonList>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};
