import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, trendingUpOutline, trendingDownOutline, pieChartOutline, flameOutline, moonOutline } from 'ionicons/icons';
import { useTxnStore } from '../state/useTxnStore';
import { sumsForMonth, groupExpensesByCategory, dailyExpenseStats } from '../selectors/transactions';
import { formatCurrency, formatMonthYear, isSameMonth } from '../utils/format';
import { useSettings } from '../state/settings';
import { ProBadge } from '../components/ProBadge';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/ui/StatTile';
import { Money } from '../components/ui/Money';
import { LineChart } from '../components/ui/LineChart';

const colors = [
  '#2dd36f', '#eb445a', '#ffc409', '#3dc2ff', '#7044ff', '#ff6b6b', '#00d4d8', '#b966ff', '#fca5a5', '#94a3b8',
];

const circumference = (r: number) => 2 * Math.PI * r;

export const Analytics: React.FC = () => {
  const items = useTxnStore((s) => s.items);
  const [month, setMonth] = useState<Date>(new Date());
  const isPro = useSettings((s) => s.isPro);

  const sums = useMemo(() => sumsForMonth(items, month), [items, month]);
  const stats = useMemo(() => dailyExpenseStats(items, month), [items, month]);
  const catData = useMemo(() => groupExpensesByCategory(items, month), [items, month]);
  const total = catData.reduce((a, b) => a + b.total, 0);
  const R = 70;
  const C = circumference(R);
  const arcData = useMemo(() => {
    let offset = 0;
    return catData.map((d, index) => {
      const fraction = total > 0 ? d.total / total : 0;
      const length = C * fraction;
      const dash = `${length} ${C - length}`;
      const strokeDashoffset = -offset;
      offset += length;
      return {
        label: d.category,
        value: d.total,
        color: colors[index % colors.length],
        percent: total > 0 ? Math.round(fraction * 100) : 0,
        dash,
        strokeDashoffset,
      };
    });
  }, [catData, total]);
  const trend = useMemo(() => {
    const txns = items.filter((t) => t.type === 'expense' && isSameMonth(t.date, month));
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const labels: string[] = [];
    const values: number[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      labels.push(`${cursor.getMonth() + 1}/${cursor.getDate()}`);
      const totalForDay = txns
        .filter((t) => t.date.getDate() === cursor.getDate())
        .reduce((sum, txn) => sum + txn.amount, 0);
      values.push(Number(totalForDay.toFixed(2)));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { labels, values };
  }, [items, month]);
  const maxDaily = trend.values.reduce((max, value) => Math.max(max, value), 0);
  const peakDayLabel = maxDaily > 0 ? (trend.labels[trend.values.indexOf(maxDaily)] ?? null) : null;

  const prevMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  return (
    <IonPage>
      <PageHeader
        title="Analytics"
        subtitle={formatMonthYear(month)}
        start={<ProBadge />}
      />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Narrate your money story</div>
          <p className="body">Pulse for {formatMonthYear(month)}</p>
          <div className="stats-row">
            <IonChip color="success">Income {formatCurrency(sums.income)}</IonChip>
            <IonChip color="danger">Expense {formatCurrency(sums.expense)}</IonChip>
            <IonChip color={sums.net >= 0 ? 'success' : 'danger'}>
              Net {sums.net >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(sums.net))}
            </IonChip>
            {!isPro && (
              <IonChip color="warning">Pro unlocks past &amp; future months</IonChip>
            )}
          </div>
        </section>

        <div className="section-stack">
          <IonCard>
            <IonCardContent>
              <div className="month-nav-card">
                <IonButton onClick={prevMonth} aria-label="Previous month" fill="outline" disabled={!isPro}>
                  <IonIcon slot="icon-only" icon={chevronBackOutline} />
                </IonButton>
                <div className="month-nav-card__label">{formatMonthYear(month)}</div>
                <IonButton onClick={nextMonth} aria-label="Next month" fill="outline" disabled={!isPro}>
                  <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Monthly pulse</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="metrics-grid">
                <StatTile icon={trendingUpOutline} label="Income" value={<Money value={sums.income} />} tone="success" />
                <StatTile icon={trendingDownOutline} label="Expenses" value={<Money value={sums.expense} />} tone="danger" />
                <StatTile icon={pieChartOutline} label="Net" value={<Money value={Math.abs(sums.net)} signed type={sums.net >= 0 ? 'income' : 'expense'} />} tone={sums.net >= 0 ? 'success' : 'danger'} />
              </div>
              <div className="calendar-legend">
                <span>Avg daily spend {formatCurrency(stats.avgDailySpend)}</span>
                <span>No-spend days {stats.noSpendDays}</span>
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard aria-label="Expense distribution">
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Expense distribution</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {total <= 0 ? (
                <div className="chart-empty">No expense data for this month.</div>
              ) : (
                <div className="donut-layout">
                  <div className="donut-figure" role="img" aria-label="Expense donut chart">
                    <svg width={220} height={220}>
                      <title>Expense donut</title>
                      <desc>Distribution of expenses in {formatMonthYear(month)}</desc>
                      <g transform="translate(110,110)">
                        <circle r={R} cx={0} cy={0} fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth={26} />
                        {arcData.map((segment) => (
                          <circle
                            key={segment.label}
                            r={R}
                            cx={0}
                            cy={0}
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth={26}
                            strokeDasharray={segment.dash}
                            strokeDashoffset={segment.strokeDashoffset}
                            aria-label={`${segment.label}: ${formatCurrency(segment.value)} (${segment.percent}%)`}
                          />
                        ))}
                      </g>
                    </svg>
                    <div className="donut-center">
                      <div className="donut-center__value">{formatCurrency(total)}</div>
                      <div className="donut-center__label">spent this month</div>
                    </div>
                  </div>
                  <IonList lines="none" className="donut-legend">
                    {catData.map((row, i) => {
                      const percent = total > 0 ? Math.round((row.total / total) * 100) : 0;
                      const color = arcData[i]?.color ?? colors[i % colors.length];
                      return (
                        <IonItem
                          key={row.category}
                          lines="none"
                          className="donut-legend__item"
                          detail={false}
                        >
                          <span slot="start" className="donut-legend__swatch" style={{ background: color }} />
                          <IonLabel>
                            <div className="donut-legend__label">
                              <span>{row.category}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="donut-legend__bar">
                              <span style={{ width: `${percent}%`, background: color }} />
                            </div>
                          </IonLabel>
                          <IonBadge slot="end" color="dark">
                            {formatCurrency(row.total)}
                          </IonBadge>
                        </IonItem>
                      );
                    })}
                  </IonList>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard aria-label="Daily trend">
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Daily burn</IonCardTitle>
              <div className="section-actions">
                <IonChip color="medium">{peakDayLabel ? `Peak ${peakDayLabel}` : 'No data'}</IonChip>
                <IonChip color="success">Avg {formatCurrency(stats.avgDailySpend)}</IonChip>
              </div>
            </IonCardHeader>
            <IonCardContent>
              {maxDaily === 0 ? (
                <div className="chart-empty">No trend yet.</div>
              ) : (
                <>
                  <div className="burn-meta">
                    <StatTile icon={flameOutline} label="Avg daily spend" value={<Money value={stats.avgDailySpend} />} tone="warning" />
                    <StatTile icon={moonOutline} label="No-spend days" value={<span>{stats.noSpendDays} days</span>} />
                    <StatTile
                      icon={trendingDownOutline}
                      label="Peak burn"
                      value={(
                        <>
                          <Money value={maxDaily} />
                          {peakDayLabel ? <span className="stat-bento__subtext">{peakDayLabel}</span> : null}
                        </>
                      )}
                      tone="danger"
                    />
                  </div>
                  <div className="chart-wrapper">
                    <LineChart labels={trend.labels} values={trend.values} height={260} filled={false} />
                  </div>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};
