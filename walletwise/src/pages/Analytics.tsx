import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonText,
  IonButtons,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToast,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, downloadOutline } from 'ionicons/icons';
import { useTxnStore } from '../state/useTxnStore';
import { sumsForMonth, groupExpensesByCategory, groupExpensesBySubcategory, dailyExpenseStats } from '../selectors/transactions';
import { formatCurrency, formatMonthYear, isSameMonth } from '../utils/format';
import { useSettings } from '../state/settings';
import { ProBadge } from '../components/ProBadge';
import { PageHeader } from '../components/PageHeader';

const colors = [
  '#2dd36f', '#eb445a', '#ffc409', '#3dc2ff', '#7044ff', '#ff6b6b', '#00d4d8', '#b966ff', '#fca5a5', '#94a3b8',
];

const circumference = (r: number) => 2 * Math.PI * r;

export const Analytics: React.FC = () => {
  const items = useTxnStore((s) => s.items);
  const [month, setMonth] = useState<Date>(new Date());
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isPro = useSettings((s) => s.isPro);

  const sums = useMemo(() => sumsForMonth(items, month), [items, month]);
  const stats = useMemo(() => dailyExpenseStats(items, month), [items, month]);
  const catData = useMemo(() => groupExpensesByCategory(items, month), [items, month]);
  const subData = useMemo(() => drillCategory ? groupExpensesBySubcategory(items, month, drillCategory) : [], [items, month, drillCategory]);
  const donutData = drillCategory ? subData.map((d) => ({ label: d.subcategory, value: d.total })) : catData.map((d) => ({ label: d.category, value: d.total }));
  const total = donutData.reduce((a, b) => a + b.value, 0);

  const prevMonth = () => {
    if (!isPro) { setToast('Pro required to view past months'); return; }
    setDrillCategory(null);
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    if (!isPro) { setToast('Pro required to view future months'); return; }
    setDrillCategory(null);
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const exportCsv = () => {
    if (!isPro && !isSameMonth(month, new Date())) {
      setToast('Free plan can export current month only');
      return;
    }
    const txns = items.filter((t) => isSameMonth(t.date, month));
    const header = ['id','type','amount','category','subcategory','note','date'];
    const rows = txns.map((t) => [
      t.id,
      t.type,
      t.amount.toFixed(2),
      t.category ?? '',
      t.subcategory ?? '',
      (t.note ?? '').replace(/\n/g, ' '),
      t.date.toISOString(),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walletwise-${formatMonthYear(month)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const R = 60; const C = circumference(R);
  let offset = 0;

  return (
    <IonPage>
      <PageHeader
        title={`${formatMonthYear(month)} Analytics`}
        start={<IonButton onClick={prevMonth} aria-label="Previous month"><IonIcon slot="icon-only" icon={chevronBackOutline} /></IonButton>}
        end={<>
          <ProBadge />
          <IonButton onClick={exportCsv} aria-label="Export CSV"><IonIcon slot="icon-only" icon={downloadOutline} /></IonButton>
          <IonButton onClick={nextMonth} aria-label="Next month"><IonIcon slot="icon-only" icon={chevronForwardOutline} /></IonButton>
        </>}
      />
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol><IonChip color="success" outline>Income {formatCurrency(sums.income)}</IonChip></IonCol>
                <IonCol><IonChip color="danger" outline>Expenses {formatCurrency(sums.expense)}</IonChip></IonCol>
                <IonCol><IonChip color={sums.net>=0?'success':'danger'} outline>Net {formatCurrency(Math.abs(sums.net))}{sums.net<0? ' (neg)': ''}</IonChip></IonCol>
              </IonRow>
              <IonRow>
                <IonCol><IonBadge color="medium">Avg daily spend {formatCurrency(stats.avgDailySpend)}</IonBadge></IonCol>
                <IonCol><IonBadge color="medium">No-spend days {stats.noSpendDays}</IonBadge></IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        <section aria-label="Expense distribution" role="region">
          <IonText color="medium">
            <p>{drillCategory ? `Subcategories of ${drillCategory}` : 'Expenses by category'}</p>
          </IonText>
          {total <= 0 ? (
            <IonText color="medium"><p>No expense data for this month.</p></IonText>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <svg width={160} height={160} role="img" aria-label="Expense donut chart">
                <title>Expense donut</title>
                <desc>Distribution of expenses {drillCategory?`for ${drillCategory}`:''} in {formatMonthYear(month)}</desc>
                <g transform={`translate(80,80)`}>
                  <circle r={R} cx={0} cy={0} fill="transparent" stroke="#eee" strokeWidth={20} />
                  {donutData.map((d, i) => {
                    const frac = d.value / total;
                    const len = C * frac;
                    const dash = `${len} ${C - len}`;
                    const strokeDashoffset = -offset;
                    offset += len;
                    return (
                      <circle
                        key={d.label}
                        r={R}
                        cx={0}
                        cy={0}
                        fill="transparent"
                        stroke={colors[i % colors.length]}
                        strokeWidth={20}
                        strokeDasharray={dash}
                        strokeDashoffset={strokeDashoffset}
                        role="button"
                        tabIndex={0}
                        aria-label={`${d.label}: ${formatCurrency(d.value)} (${Math.round(frac*100)}%)`}
                        onClick={() => {
                          if (!drillCategory) setDrillCategory(d.label); else setDrillCategory(null);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!drillCategory) setDrillCategory(d.label); else setDrillCategory(null); } }}
                      />
                    );
                  })}
                </g>
              </svg>
              <div>
                {(drillCategory ? subData.map(s => ({ label: s.subcategory, value: s.total })) : catData.map(c => ({ label: c.category, value: c.total }))).map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span aria-hidden style={{ width: 12, height: 12, background: colors[i % colors.length], display: 'inline-block' }}></span>
                    <span>{row.label}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{formatCurrency(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {drillCategory ? (
          <IonButton className="ion-margin-top" onClick={() => setDrillCategory(null)}>
            Back to categories
          </IonButton>
        ) : null}
        <IonToast isOpen={toast!==null} message={toast ?? ''} duration={2000} position="bottom" onDidDismiss={() => setToast(null)} />
      </IonContent>
    </IonPage>
  );
};
