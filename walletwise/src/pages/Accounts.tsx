import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonRippleEffect,
} from '@ionic/react';
import { cardOutline, walletOutline, cashOutline } from 'ionicons/icons';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import type { Account, AccountType } from '../types/account';
import { formatDateTime } from '../utils/format';
import { useSettings } from '../state/settings';
import { ProBadge } from '../components/ProBadge';
import { PageHeader } from '../components/PageHeader';
import { Money } from '../components/ui/Money';
import { StatTile } from '../components/ui/StatTile';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonList';

type Mode = 'create' | 'edit';

interface FormState {
  name: string;
  type: AccountType;
  currency: string;
  balanceCurrent: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  type: 'cash',
  currency: 'USD',
  balanceCurrent: '0',
};

export const Accounts: React.FC = () => {
  const { user } = useAuthStore();
  const uid = user?.uid;
  const isPro = useSettings((s) => s.isPro);
  const defaultCurrency = useSettings((s) => s.currency);
  const { items, loading, error, addAccount, updateAccount, deleteAccount, canCreate } = useAccounts(uid, { isPro });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [selected, setSelected] = useState<Account | null>(null);
  const [detailsAccount, setDetailsAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' | 'medium' } | null>(null);

  const openCreate = () => {
    setMode('create');
    setForm({ ...DEFAULT_FORM, currency: defaultCurrency || 'USD' });
    setSelected(null);
    setIsModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setMode('edit');
    setSelected(a);
    setForm({
      name: a.name,
      type: a.type,
      currency: a.currency ?? defaultCurrency ?? 'USD',
      balanceCurrent: String(a.balanceCurrent),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  const handleSave = async () => {
    try {
      if (mode === 'create') {
        await addAccount({
          name: form.name.trim(),
          type: form.type,
          currency: form.currency || defaultCurrency || 'USD',
          balanceCurrent: Number.parseFloat(form.balanceCurrent) || 0,
          createdAt: null,
          updatedAt: null,
        } as any);
        setToast({ message: 'Account created', color: 'success' });
      } else if (selected) {
        await updateAccount(selected.id, {
          balanceCurrent: Number.parseFloat(form.balanceCurrent) || 0,
          currency: form.currency || defaultCurrency || 'USD',
        });
        setToast({ message: 'Account updated', color: 'success' });
      }
      closeModal();
    } catch (e: any) {
      setToast({ message: e?.message || 'Operation failed', color: 'danger' });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteAccount(selected.id);
      setToast({ message: 'Account deleted', color: 'success' });
      closeModal();
    } catch (e: any) {
      setToast({ message: e?.message || 'Delete failed', color: 'danger' });
    }
  };

  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  const metrics = useMemo(() => {
    const total = items.reduce((sum, a) => sum + a.balanceCurrent, 0);
    const cashBank = items.filter((a) => a.type === 'bank' || a.type === 'cash').reduce((sum, a) => sum + a.balanceCurrent, 0);
    const wallets = items.filter((a) => a.type === 'ewallet').reduce((sum, a) => sum + a.balanceCurrent, 0);
    const creditLimit = items.filter((a) => a.type === 'credit').reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);
    const lastTouch = items
      .map((a) => a.updatedAt ?? a.createdAt ?? null)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const typeCounts = items.reduce<Record<string, number>>((acc, account) => {
      acc[account.type] = (acc[account.type] ?? 0) + 1;
      return acc;
    }, {});
    return { total, cashBank, wallets, creditLimit, lastTouch, typeCounts };
  }, [items]);

  return (
    <IonPage>
      <PageHeader
        title="Accounts"
        subtitle="Treasury stack"
        start={<ProBadge />}
      />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Portfolio snapshot</div>
          <p className="body">Surface balance health across banks, wallets, and credit.</p>
          <div className="stats-row">
            <IonChip color="medium">Accounts {items.length}</IonChip>
          </div>
          <div className="header-actions">
            <IonButton color="primary" onClick={openCreate} disabled={!canCreate}>Add account</IonButton>
          </div>
        </section>

        {error ? <ErrorBanner message={error} /> : null}

        <div className="section-stack">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Snapshot</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="metrics-grid">
                <StatTile icon={cardOutline} label="Total balance" value={<Money value={metrics.total} />} />
                <StatTile icon={walletOutline} label="Cash & bank" value={<Money value={metrics.cashBank} />} tone="success" />
                <StatTile icon={cashOutline} label="Wallets" value={<Money value={metrics.wallets} />} />
                <StatTile icon={cardOutline} label="Credit capacity" value={<Money value={metrics.creditLimit} />} tone="warning" />
              </div>
            </IonCardContent>
          </IonCard>

          {!canCreate ? (
            <IonCard>
              <IonCardHeader className="section-title-row">
                <IonCardTitle>Limit reached</IonCardTitle>
                <IonButton size="small" fill="outline" routerLink="/settings">Upgrade to Pro</IonButton>
              </IonCardHeader>
              <IonCardContent>
                <p className="body">Free plan allows up to 5 accounts. Unlock unlimited accounts and smart syncing with Pro.</p>
              </IonCardContent>
            </IonCard>
          ) : null}

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>Accounts</IonCardTitle>
              <IonButton size="small" fill="outline" onClick={openCreate} disabled={!canCreate}>New account</IonButton>
            </IonCardHeader>
            <IonCardContent>
              {loading ? (
                <SkeletonList count={3} />
              ) : sorted.length === 0 ? (
                <EmptyState title="No accounts yet" message="Connect a bank, card, or wallet to start forecasting." />
              ) : (
                <div className="account-card-grid">
                  {sorted.map((a) => {
                    const last = a.updatedAt ?? a.createdAt ?? null;
                    const max = a.creditLimit ?? 0;
                    const usage = a.type === 'credit'
                      ? Math.round((Math.min(Math.max(0, a.balanceCurrent), max || 1) / (max || 1)) * 100)
                      : null;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        className="account-card ion-activatable ripple-parent"
                        data-variant={a.type}
                        onClick={() => setDetailsAccount(a)}
                      >
                        <div className="account-card__top">
                          <IonChip color="dark" className="account-card__chip">{a.type}</IonChip>
                          {a.institution ? <span className="account-card__institution">{a.institution}</span> : null}
                        </div>
                        <div className="account-card__name">{a.name}</div>
                        <div className="account-card__balance">
                          <Money value={a.balanceCurrent} />
                        </div>
                        <div className="account-card__meta">
                          <span>{a.numberMasked || '****'}</span>
                          {usage !== null ? <span>Usage {usage}%</span> : null}
                          {last ? <span>Updated {formatDateTime(last)}</span> : null}
                        </div>
                        <IonRippleEffect />
                      </button>
                    );
                  })}
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        <IonModal
          isOpen={detailsAccount !== null}
          onDidDismiss={() => setDetailsAccount(null)}
          breakpoints={[0, 0.6, 0.9]}
          initialBreakpoint={0.8}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{detailsAccount?.name ?? 'Account'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setDetailsAccount(null)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {detailsAccount ? (
              <>
                <IonCard>
                  <IonCardContent>
                    <div
                      className="account-card"
                      data-variant={detailsAccount.type}
                      style={{ cursor: 'default' }}
                    >
                      <div className="account-card__top">
                        <IonChip color="dark" className="account-card__chip">
                          {detailsAccount.type}
                        </IonChip>
                        {detailsAccount.institution ? (
                          <span className="account-card__institution">
                            {detailsAccount.institution}
                          </span>
                        ) : null}
                      </div>
                      <div className="account-card__name">{detailsAccount.name}</div>
                      <div className="account-card__balance">
                        <Money value={detailsAccount.balanceCurrent} />
                      </div>
                      <div className="account-card__meta">
                        <span>{detailsAccount.numberMasked || '••••'}</span>
                        {detailsAccount.creditLimit ? (
                          <span>
                            Limit&nbsp;
                            <Money value={detailsAccount.creditLimit} />
                          </span>
                        ) : null}
                        {detailsAccount.updatedAt || detailsAccount.createdAt ? (
                          <span>
                            Updated{' '}
                            {(detailsAccount.updatedAt ?? detailsAccount.createdAt)?.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>

                <IonButton
                  expand="block"
                  fill="outline"
                  className="ion-margin-top"
                  onClick={() => {
                    if (detailsAccount) {
                      openEdit(detailsAccount);
                    }
                    setDetailsAccount(null);
                  }}
                >
                  Edit account
                </IonButton>
              </>
            ) : null}
          </IonContent>
        </IonModal>

        <IonModal isOpen={isModalOpen} onDidDismiss={closeModal} breakpoints={[0, 0.5, 0.9]} initialBreakpoint={0.9}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{mode === 'create' ? 'New Account' : 'Account Details'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeModal}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Account name</IonLabel>
              <IonInput value={form.name} onIonInput={(e) => setForm((p) => ({ ...p, name: e.detail.value ?? '' }))} disabled={mode === 'edit'} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Account type</IonLabel>
              <IonSelect value={form.type} onIonChange={(e) => setForm((p) => ({ ...p, type: (e.detail.value as AccountType) ?? p.type }))} disabled={mode === 'edit'} interface="popover">
                <IonSelectOption value="bank">Bank</IonSelectOption>
                <IonSelectOption value="ewallet">eWallet</IonSelectOption>
                <IonSelectOption value="cash">Cash</IonSelectOption>
                <IonSelectOption value="credit">Credit</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Initial value</IonLabel>
              <IonInput type="number" inputMode="decimal" value={form.balanceCurrent} onIonInput={(e) => setForm((p) => ({ ...p, balanceCurrent: e.detail.value ?? p.balanceCurrent }))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Currency</IonLabel>
              <IonSelect value={form.currency} onIonChange={(e) => setForm((p) => ({ ...p, currency: (e.detail.value as string) || p.currency }))} interface="popover">
                <IonSelectOption value="USD">USD</IonSelectOption>
                <IonSelectOption value="MYR">MYR</IonSelectOption>
                <IonSelectOption value="EUR">EUR</IonSelectOption>
                <IonSelectOption value="GBP">GBP</IonSelectOption>
                <IonSelectOption value="INR">INR</IonSelectOption>
              </IonSelect>
            </IonItem>

            <div className="ion-padding-top">
              <IonButton expand="block" onClick={handleSave} disabled={mode === 'create' && !canCreate}>
                {mode === 'create' ? 'Create Account' : 'Save Changes'}
              </IonButton>
              {mode === 'edit' ? (
                <IonButton expand="block" color="danger" fill="outline" onClick={handleDelete} className="ion-margin-top">
                  Delete Account
                </IonButton>
              ) : null}
            </div>
          </IonContent>
        </IonModal>

        <IonToast isOpen={toast !== null} message={toast?.message} color={toast?.color} duration={2200} position="bottom" onDidDismiss={() => setToast(null)} />
      </IonContent>
    </IonPage>
  );
};
