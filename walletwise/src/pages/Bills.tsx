import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonDatetime,
  IonChip,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { useAuthStore } from '../state/useAuthStore';
import { useBills } from '../features/bills/useBills';
import { useAccounts } from '../features/accounts/useAccounts';
import { computeSpendableForAccount } from '../features/spendable/spendable';
import { useSettings } from '../state/settings';
import type { BillRepeat } from '../types/bill';
import { PageHeader } from '../components/PageHeader';
import { ProBadge } from '../components/ProBadge';
import { Money } from '../components/ui/Money';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonList';

type Mode = 'create' | 'edit';

interface BillFormState {
  id?: string;
  name: string;
  amount: string;
  accountId: string;
  repeat: BillRepeat;
  dueIso: string;
  notes: string;
}

const buildForm = (): BillFormState => ({
  name: '',
  amount: '',
  accountId: '',
  repeat: 'monthly',
  dueIso: new Date().toISOString(),
  notes: '',
});

export const Bills: React.FC = () => {
  const { user } = useAuthStore();
  const uid = user?.uid;
  const isPro = useSettings((s) => s.isPro);
  const spendWindowDays = useSettings((s) => s.spendWindowDays);
  const {
    items: bills,
    loading,
    error,
    addBill,
    updateBill,
    deleteBill,
  } = useBills(uid);
  const { items: accounts, loading: accountsLoading } = useAccounts(uid, { isPro });

  const [mode, setMode] = useState<Mode>('create');
  const [form, setForm] = useState<BillFormState>(() => buildForm());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' | 'medium' } | null>(null);

  const openCreate = () => {
    const base = buildForm();
    if (accounts.length > 0) base.accountId = accounts[0].id;
    setForm(base);
    setMode('create');
    setIsModalOpen(true);
  };

  const openEdit = (id: string) => {
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    setForm({
      id: bill.id,
      name: bill.name,
      amount: bill.amount.toString(),
      accountId: bill.accountId,
      repeat: bill.repeat,
      dueIso: bill.dueDate.toISOString(),
      notes: bill.notes ?? '',
    });
    setMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!uid) return;
    if (!form.name.trim() || !form.accountId) {
      setToast({ message: 'Name and account are required.', color: 'danger' });
      return;
    }
    const amount = Number.parseFloat(form.amount || '0');
    if (!(amount > 0)) {
      setToast({ message: 'Enter an amount greater than zero.', color: 'danger' });
      return;
    }
    const dueDate = new Date(form.dueIso || new Date().toISOString());
    setSaving(true);
    try {
      if (mode === 'create') {
        await addBill({
          name: form.name.trim(),
          amount,
          accountId: form.accountId,
          dueDate,
          repeat: form.repeat,
          overrideAccountId: undefined,
          status: 'unpaid',
          notes: form.notes || undefined,
        });
        setToast({ message: 'Bill added', color: 'success' });
      } else if (mode === 'edit' && form.id) {
        await updateBill(form.id, {
          name: form.name.trim(),
          amount,
          accountId: form.accountId,
          dueDate,
          repeat: form.repeat,
          notes: form.notes || undefined,
        });
        setToast({ message: 'Bill updated', color: 'success' });
      }
      closeModal();
    } catch (e: any) {
      setToast({ message: e?.message ?? 'Failed to save bill', color: 'danger' });
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    setSaving(true);
    try {
      await deleteBill(form.id);
      setToast({ message: 'Bill deleted', color: 'success' });
      closeModal();
    } catch (e: any) {
      setToast({ message: e?.message ?? 'Failed to delete bill', color: 'danger' });
      setSaving(false);
    }
  };

  const byAccount = useMemo(() => {
    return accounts.map((a) => {
      const s = computeSpendableForAccount(a, bills);
      return { account: a, spendable: s };
    });
  }, [accounts, bills]);

  const monthlyTotal = bills.reduce((acc, b) => acc + b.amount, 0);

  return (
    <IonPage>
      <PageHeader
        title="Bills"
        subtitle={isPro ? 'Recurring obligations' : 'Recurring obligations (demo)'}
        start={<ProBadge />}
      />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Plan around your bills</div>
          <p className="body">
            Capture rent, subscriptions, and loan payments so your safe‑to‑spend stays honest.
          </p>
          <div className="stats-row">
            <IonChip color="warning">
              Monthly bills&nbsp;
              <Money value={monthlyTotal} />
            </IonChip>
            <IonChip color="medium">
              Window&nbsp;
              {spendWindowDays} days
            </IonChip>
          </div>
          <div className="header-actions">
            <IonButton color="primary" onClick={openCreate} disabled={!isPro || accounts.length === 0}>
              <IonIcon slot="start" icon={addOutline} />
              Add bill
            </IonButton>
            {!isPro && (
              <IonButton fill="outline" color="warning" routerLink="/settings">
                Unlock Pro controls
              </IonButton>
            )}
          </div>
        </section>

        <div className="section-stack">
          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>By account</IonCardTitle>
              <IonBadge color="medium">{spendWindowDays}-day window</IonBadge>
            </IonCardHeader>
            <IonCardContent>
              {accountsLoading ? (
                <SkeletonList count={2} />
              ) : accounts.length === 0 ? (
                <EmptyState
                  title="No accounts yet"
                  message="Add an account first to attach bills to it."
                />
              ) : (
                <div className="bills-account-list">
                  {byAccount.map(({ account, spendable }) => (
                    <div key={account.id} className="bills-account-row">
                      <div className="bills-account-row__header">
                        <div className="h2" style={{ color: 'var(--ion-text-color)' }}>
                          {account.name}
                        </div>
                        <div className="body">{account.type}</div>
                      </div>
                      <div className="bills-account-row__metrics">
                        <div>
                          <span className="body">Balance</span>
                          <div><Money value={account.balanceCurrent} /></div>
                        </div>
                        <div>
                          <span className="body">Bills in window</span>
                          <div><Money value={spendable.obligationsWindow} /></div>
                        </div>
                        <div>
                          <span className="body">Safe to spend</span>
                          <div>
                            <Money
                              value={Math.abs(spendable.safeToSpend)}
                              signed
                              type={spendable.safeToSpend >= 0 ? 'income' : 'expense'}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bills-account-bar">
                        <div className="bills-account-bar__obligations" />
                        <div
                          className="bills-account-bar__safe"
                          style={{
                            width: `${Math.max(0, Math.min(100, account.balanceCurrent !== 0
                              ? (Math.max(0, spendable.safeToSpend) / Math.max(Math.abs(account.balanceCurrent), 1)) * 100
                              : 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader className="section-title-row">
              <IonCardTitle>All bills</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {error ? <ErrorBanner message={error} /> : null}
              {loading ? (
                <SkeletonList count={3} />
              ) : bills.length === 0 ? (
                <EmptyState
                  title="No bills yet"
                  message="Add your recurring payments to keep spendable accurate."
                />
              ) : (
                <IonList inset={false}>
                  {bills.map((b) => {
                    const accountName = accounts.find((a) => a.id === b.accountId)?.name ?? 'Account';
                    return (
                      <IonItem
                        key={b.id}
                        button
                        detail
                        onClick={() => openEdit(b.id)}
                      >
                        <IonLabel>
                          <h3>{b.name}</h3>
                          <p>
                            {accountName} • Due{' '}
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
                    );
                  })}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        <IonModal isOpen={isModalOpen} onDidDismiss={closeModal}>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{mode === 'create' ? 'Add bill' : 'Edit bill'}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <IonList inset={false}>
                <IonItem>
                  <IonLabel position="stacked">Name</IonLabel>
                  <IonInput
                    value={form.name}
                    onIonInput={(e) => setForm((f) => ({ ...f, name: e.detail.value ?? '' }))}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Amount</IonLabel>
                  <IonInput
                    type="number"
                    inputMode="decimal"
                    value={form.amount}
                    onIonInput={(e) => setForm((f) => ({ ...f, amount: e.detail.value ?? '' }))}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Paid from account</IonLabel>
                  <IonSelect
                    value={form.accountId}
                    interface="popover"
                    onIonChange={(e) =>
                      setForm((f) => ({ ...f, accountId: (e.detail.value as string) ?? f.accountId }))
                    }
                  >
                    {accounts.map((a) => (
                      <IonSelectOption key={a.id} value={a.id}>
                        {a.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Due date</IonLabel>
                  <IonDatetime
                    presentation="date"
                    value={form.dueIso}
                    onIonChange={(e) =>
                      setForm((f) => ({ ...f, dueIso: (e.detail.value as string) ?? f.dueIso }))
                    }
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Repeat</IonLabel>
                  <IonSelect
                    value={form.repeat}
                    interface="popover"
                    onIonChange={(e) =>
                      setForm((f) => ({ ...f, repeat: (e.detail.value as BillRepeat) ?? f.repeat }))
                    }
                  >
                    <IonSelectOption value="none">One‑time</IonSelectOption>
                    <IonSelectOption value="monthly">Monthly</IonSelectOption>
                    <IonSelectOption value="yearly">Yearly</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Notes</IonLabel>
                  <IonInput
                    value={form.notes}
                    onIonInput={(e) => setForm((f) => ({ ...f, notes: e.detail.value ?? '' }))}
                  />
                </IonItem>
              </IonList>
              <div className="stack-gap ion-margin-top">
                <IonButton expand="block" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : mode === 'create' ? 'Add bill' : 'Save changes'}
                </IonButton>
                {mode === 'edit' && (
                  <IonButton
                    expand="block"
                    color="danger"
                    fill="outline"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete bill
                  </IonButton>
                )}
                <IonButton expand="block" fill="outline" onClick={closeModal} disabled={saving}>
                  Cancel
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </IonModal>

        {toast ? (
          <div className="ledger-empty">
            <IonText color={toast.color}>
              <p>{toast.message}</p>
            </IonText>
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  );
};
