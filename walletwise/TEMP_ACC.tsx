import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
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
import { addOutline, cardOutline, walletOutline, cashOutline } from 'ionicons/icons';
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
  institution: string;
  numberMasked: string;
  balanceCurrent: string;
  creditLimit: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  type: 'cash',
  institution: '',
  numberMasked: '',
  balanceCurrent: '0',
  creditLimit: '',
};

const buildEditForm = (a: Account): FormState => ({
  name: a.name,
  type: a.type,
  institution: a.institution ?? '',
  numberMasked: a.numberMasked ?? '',
  balanceCurrent: String(a.balanceCurrent),
  creditLimit: a.creditLimit != null ? String(a.creditLimit) : '',
});

export const Accounts: React.FC = () => {
  const { user } = useAuthStore();
  const uid = user?.uid;
  const isPro = useSettings((s) => s.isPro);
  const { items, loading, error, addAccount, updateAccount, deleteAccount, canCreate, createDisabledReason } = useAccounts(uid, { isPro });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [selected, setSelected] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' | 'medium' } | null>(null);

  const openCreate = () => {
    setMode('create');
    setForm(DEFAULT_FORM);
    setSelected(null);
    setIsModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setMode('edit');
    setSelected(a);
    setForm(buildEditForm(a));
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
          institution: form.institution.trim() || undefined,
          numberMasked: form.numberMasked.trim() || undefined,
          balanceCurrent: Number.parseFloat(form.balanceCurrent) || 0,
          creditLimit: form.creditLimit ? Number.parseFloat(form.creditLimit) : undefined,
          createdAt: null,
          updatedAt: null,
        } as any);
        setToast({ message: 'Account created', color: 'success' });
      } else if (selected) {
        await updateAccount(selected.id, {
          balanceCurrent: Number.parseFloat(form.balanceCurrent) || 0,
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
        description="Curate every financial surface with clarity."
        start={<ProBadge />}
        end={(
          <IonButton onClick={openCreate} disabled={!canCreate} title={createDisabledReason ?? undefined}>
            <IonIcon slot="icon-only" icon={addOutline} />
          </IonButton>
        )}
      />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Portfolio snapshot</div>
          <p className="body">Surface balance health across banks, wallets, and credit.</p>
          <div className="stats-row">
            <IonChip color="medium">Accounts {items.length}</IonChip>
            {metrics.lastTouch ? <IonChip color="medium">Updated {formatDateTime(metrics.lastTouch)}</IonChip> : null}
          </div>
          <div className="header-actions">
            <IonButton color="primary" onClick={openCreate} disabled={!canCreate}>Add account</IonButton>
            <IonButton fill="outline" routerLink="/settings">Preferences</IonButton>
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
                        onClick={() => openEdit(a)}
                      >
                        <div className="account-card__top">
                          <IonChip color="dark" className="account-card__chip">{a.type}</IonChip>
                          {a.institution ? <span className="account-card__institution">{a.institution}</span> : null}
                        </div>
                        <div className="account-card__name">{a.name}</div>
                        <div className="account-card__balance">
