import React, { useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonChip,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonText,
} from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore';
import { useBills } from '../features/bills/useBills';
import { useTxnStore } from '../state/useTxnStore';
import { computeSpendableForAccount } from '../features/spendable/spendable';
import { PageHeader } from '../components/PageHeader';
import { ProBadge } from '../components/ProBadge';
import { Money } from '../components/ui/Money';
import { EmptyState } from '../components/ui/EmptyState';
import type { Account } from '../types/account';

export const AccountDetails: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ account?: Account }>();
  const { user } = useAuthStore();
  const uid = user?.uid;
  const account = location.state?.account ?? null;
  const { items: bills } = useBills(uid);
  const txns = useTxnStore((s) => s.items);

  const spendable = account ? computeSpendableForAccount(account, bills) : null;

  const accountBills = useMemo(
    () =>
      account
        ? bills.filter((b) => (b.overrideAccountId ?? b.accountId) === account.id)
        : [],
    [bills, account],
  );

  const recentTxns = useMemo(
    () =>
      account
        ? txns
            .filter((t) => (t as any).accountId === account.id)
            .slice()
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5)
        : [],
    [txns, account],
  );

  if (!account) {
    return (
      <IonPage>
        <PageHeader title="Account" start={<ProBadge />} />
        <IonContent className="app-content">
          <EmptyState
            title="Account not available"
            message="Open this account from the Accounts screen to view its details."
          />
          <IonButton className="ion-margin-top" onClick={() => history.replace('/accounts')}>
            Back to accounts
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <PageHeader
        title={account.name}
        subtitle={account.type}
        start={<ProBadge />}
        end={(
          <IonButton size="small" fill="outline" onClick={() => history.push('/accounts')}>
            Edit in Accounts
          </IonButton>
        )}
      />
      <IonContent className="app-content">
        <>
            <section className="header-gradient">
              <div className="h1">{account.name}</div>
              <p className="body">
                {account.institution || account.type}
              </p>
              <div className="stats-row">
                <IonChip color="medium">
                  Balance&nbsp;
                  <Money value={account.balanceCurrent} />
                </IonChip>
                {spendable && (
                  <IonChip color={spendable.safeToSpend >= 0 ? 'success' : 'danger'}>
                    Safe&nbsp;
                    <Money
                      value={Math.abs(spendable.safeToSpend)}
                      signed
                      type={spendable.safeToSpend >= 0 ? 'income' : 'expense'}
                    />
                  </IonChip>
                )}
              </div>
            </section>

            <div className="section-stack">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Card details</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="account-card ion-activatable ripple-parent" data-variant={account.type}>
                    <div className="account-card__top">
                      <IonChip color="dark" className="account-card__chip">
                        {account.type}
                      </IonChip>
                      {account.institution ? (
                        <span className="account-card__institution">{account.institution}</span>
                      ) : null}
                    </div>
                    <div className="account-card__name">{account.name}</div>
                    <div className="account-card__balance">
                      <Money value={account.balanceCurrent} />
                    </div>
                    <div className="account-card__meta">
                      <span>{account.numberMasked || '••••'}</span>
                      {account.creditLimit ? (
                        <span>
                          Limit&nbsp;
                          <Money value={account.creditLimit} />
                        </span>
                      ) : null}
                      {account.updatedAt || account.createdAt ? (
                        <span>
                          Updated{' '}
                          {(account.updatedAt ?? account.createdAt)?.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>

              {spendable && (
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Spendable & obligations</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="summary-grid">
                      <div>
                        <h3>Due today</h3>
                        <p className="summary-value">
                          <Money value={spendable.dueToday} />
                        </p>
                      </div>
                      <div>
                        <h3>Bills in window</h3>
                        <p className="summary-value">
                          <Money value={spendable.obligationsWindow} />
                        </p>
                      </div>
                      <div>
                        <h3>Safe to spend</h3>
                        <p className="summary-value">
                          <Money
                            value={Math.abs(spendable.safeToSpend)}
                            signed
                            type={spendable.safeToSpend >= 0 ? 'income' : 'expense'}
                          />
                        </p>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              )}

              <IonCard>
                <IonCardHeader className="section-title-row">
                  <IonCardTitle>Bills from this account</IonCardTitle>
                  <IonBadge color="warning">{accountBills.length}</IonBadge>
                </IonCardHeader>
                <IonCardContent>
                  {accountBills.length === 0 ? (
                    <EmptyState
                      title="No bills attached"
                      message="Attach bills to this account to include them in safe‑to‑spend."
                    />
                  ) : (
                    <IonList inset={false}>
                      {accountBills.map((b) => (
                        <IonItem key={b.id}>
                          <IonLabel>
                            <h3>{b.name}</h3>
                            <p>
                              Due{' '}
                              {b.dueDate.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              • {b.repeat === 'monthly' ? 'Monthly' : b.repeat === 'yearly' ? 'Yearly' : 'One‑time'}
                            </p>
                          </IonLabel>
                          <IonBadge slot="end" color="warning">
                            <Money value={b.amount} />
                          </IonBadge>
                        </IonItem>
                      ))}
                    </IonList>
                  )}
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardHeader className="section-title-row">
                  <IonCardTitle>Recent activity</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {recentTxns.length === 0 ? (
                    <IonText color="medium">
                      <p>No transactions yet for this account.</p>
                    </IonText>
                  ) : (
                    <IonList inset={false}>
                      {recentTxns.map((t) => (
                        <IonItem key={t.id}>
                          <IonLabel>
                            <h3>{t.category || 'Transaction'}</h3>
                            {t.note ? <p>{t.note}</p> : null}
                            <p>{t.date.toLocaleDateString()}</p>
                          </IonLabel>
                          <IonBadge
                            slot="end"
                            color={t.type === 'income' ? 'success' : 'danger'}
                          >
                            <Money
                              value={Math.abs(t.amount)}
                              signed
                              type={t.type === 'income' ? 'income' : 'expense'}
                            />
                          </IonBadge>
                        </IonItem>
                      ))}
                    </IonList>
                  )}
                </IonCardContent>
              </IonCard>
            </div>
          </>
      </IonContent>
    </IonPage>
  );
};
