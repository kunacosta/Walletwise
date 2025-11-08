import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
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
import { useHistory } from 'react-router-dom';

interface DayInfo {
  date: Date;
  inMonth: boolean;
  net: number; // income - expense for that day
  billsDue: number; // total due amount that day (all accounts)
  txns: Transaction[];
}

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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={prevMonth}><IonIcon slot="icon-only" icon={chevronBackOutline} /></IonButton>
          </IonButtons>
          <IonTitle>{formatMonthYear(currentMonth)} — Income {formatCurrency(summary.income)} · Expense {formatCurrency(summary.expense)} · Net {formatCurrency(summary.net)}</IonTitle>
          <IonButtons slot="end">
            <ProBadge />
            <IonButton onClick={nextMonth}><IonIcon slot="icon-only" icon={chevronForwardOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <IonCol key={d} className="ion-text-center" size="" style={{ fontWeight: 600 }}>{d}</IonCol>
            ))}
          </IonRow>
          {Array.from({ length: grid.length / 7 }, (_, r) => r).map((row) => (
            <IonRow key={row}>
              {grid.slice(row * 7, row * 7 + 7).map((cell) => (
                <IonCol key={cell.date.toISOString()}>
                  <IonCard button onClick={() => openDay(cell.date)} color={cell.inMonth ? undefined : 'light'}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{cell.date.getDate()}</strong>
                        {cell.billsDue > 0 ? (
                          <IonBadge color="warning">Bills {formatCurrency(cell.billsDue)}</IonBadge>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <IonBadge color={cell.net >= 0 ? 'success' : 'danger'}>
                          {cell.net >= 0 ? '+' : ''}{formatCurrency(cell.net >= 0 ? cell.net : -cell.net)}
                        </IonBadge>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          ))}
        </IonGrid>

        <IonModal isOpen={isDayOpen} onDidDismiss={closeDay} breakpoints={[0, 0.5, 0.95]} initialBreakpoint={0.95}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedDay ? formatDayLabel(selectedDay) : 'Day'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => { if (selectedDay) { history.push(`/transactions/new?date=${selectedDay.toISOString()}`); setIsDayOpen(false);} }}>
                  <IonIcon slot="start" icon={addOutline} /> Add Transaction
                </IonButton>
                <IonButton onClick={closeDay}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
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
                      <h3>{t.category}{t.subcategory ? ` / ${t.subcategory}` : ''}</h3>
                      <p>{t.type}</p>
                    </IonLabel>
                    <IonBadge slot="end" color={t.type === 'income' ? 'success' : 'danger'}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
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
