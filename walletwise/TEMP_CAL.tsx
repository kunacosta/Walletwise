import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
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
  billsDue: number; // total due amount that day (all accounts)
  txns: Transaction[];
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
    const net = dayTxns.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    // Bills due that day (sum amounts for bills whose next occurrence equals day)
    const billsDue = bills.reduce((acc, b) => {
      const next = nextOccurrenceOnOrAfter(b, day);
      const due = next && isSameDay(next, day) && (b.status === 'unpaid' || b.status === 'scheduled');
      return due ? acc + b.amount : acc;
    }, 0);
    days.push({ date: day, inMonth: isSameMonth(day, month), net, billsDue, txns: dayTxns });
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
    return items.filter((t) => isSameDay(t.date, selectedDay));
  }, [items, selectedDay]);

  const dayBills = useMemo(() => {
    if (!selectedDay) return [];
    return bills.filter((b) => {
      const next = nextOccurrenceOnOrAfter(b, selectedDay);
      return next && isSameDay(next, selectedDay) && (b.status === 'unpaid' || b.status === 'scheduled');
    });
  }, [bills, selectedDay]);

  const weekdayLabels = useMemo(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (firstDayOfWeek === 1) {
      return [...labels.slice(1), labels[0]];
    }
    return labels;
  }, [firstDayOfWeek]);
  const today = new Date();

  return (
    <IonPage>
      <PageHeader
        title="Calendar"
        subtitle={formatMonthYear(currentMonth)}
        start={<ProBadge />}
        end={(
          <>
            <IonButton onClick={prevMonth} aria-label="Previous month"><IonIcon slot="icon-only" icon={chevronBackOutline} /></IonButton>
            <IonButton onClick={nextMonth} aria-label="Next month"><IonIcon slot="icon-only" icon={chevronForwardOutline} /></IonButton>
          </>
        )}
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
            <IonCardHeader>
              <IonCardTitle>Calendar</IonCardTitle>
            </IonCardHeader>
            <IonCardContent className={styles.calendarCard}>
              <IonGrid fixed>
                <IonRow>
                  {weekdayLabels.map((d) => (
                    <IonCol key={d} className={`${styles.weekday} ion-text-center`}>
                      {d}
                    </IonCol>
                  ))}
                </IonRow>
                {Array.from({ length: grid.length / 7 }, (_, r) => r).map((row) => (
                  <IonRow key={row}>
                    {grid.slice(row * 7, row * 7 + 7).map((cell) => {
                      const isToday = isSameDay(cell.date, today);
                      const visibleTxns = cell.txns.slice(0, 2);
                      const classes = [styles.dayCard, cell.inMonth ? '' : styles.dayCardMuted, isToday ? styles.dayCardToday : '', 'ion-activatable', 'ripple-parent']
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <IonCol key={cell.date.toISOString()}>
                          <button
                            type="button"
                            className={classes}
                            onClick={() => openDay(cell.date)}
                          >
                            <div className={styles.dayHeader}>
                              <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                              {isToday ? <span className={styles.todayPill}>Today</span> : null}
                            </div>
                            <div className={styles.dayHighlights}>
                              <IonBadge className={styles.inlineBadge} color={cell.net >= 0 ? 'success' : 'danger'}>
                                <Money value={Math.abs(cell.net)} signed type={cell.net >= 0 ? 'income' : 'expense'} />
                              </IonBadge>
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
