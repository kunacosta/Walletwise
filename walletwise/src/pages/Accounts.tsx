import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
  IonButtons,
  IonToast,
} from '@ionic/react';
import { addOutline, cardOutline, walletOutline, cashOutline } from 'ionicons/icons';
import { IonChip, IonCardSubtitle } from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import type { Account, AccountType } from '../types/account';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useSettings } from '../state/settings';
import { ProBadge } from '../components/ProBadge';

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

  const title = mode === 'create' ? 'New Account' : 'Account Details';

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
        // Per spec: editing balanceCurrent only in details sheet
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><ProBadge /></IonButtons>
          <IonTitle>Accounts</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openCreate} disabled={!canCreate} title={createDisabledReason ?? undefined}>
              <IonIcon slot="icon-only" icon={addOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!canCreate ? (
          <IonText color="medium">
            <p>Free plan allows up to 5 accounts. <IonButton fill="outline" size="small">Upgrade to Pro</IonButton></p>
          </IonText>
        ) : null}
        {loading ? <IonText color="medium"><p>Loading accounts…</p></IonText> : null}
        {error ? (
          <IonText color="danger" role="alert">
            <p>{error}</p>
          </IonText>
        ) : null}
        {!loading && sorted.length === 0 ? (
          <div className="empty-state">
            <div>
              <IonText color="medium"><p>No accounts yet</p></IonText>
              <IonButton className="ion-margin-top" onClick={openCreate} disabled={!canCreate} title={createDisabledReason ?? undefined}>Add your first account</IonButton>
            </div>
          </div>
        ) : null}
        <IonGrid>
          <IonRow>
            {sorted.map((a) => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={a.id}>
                <IonCard button onClick={() => openEdit(a)}>
                  <IonCardHeader>
                    <IonCardTitle>
                      <IonIcon icon={a.type === 'bank' || a.type === 'credit' ? cardOutline : a.type === 'cash' ? cashOutline : walletOutline} style={{ marginRight: 8 }} />
                      {a.name}
                    </IonCardTitle>
                    <IonCardSubtitle>
                      <div className="chip-row">
                        <IonChip color="secondary" outline>{a.type}</IonChip>
                        {a.institution ? <IonChip outline>{a.institution}</IonChip> : null}
                      </div>
                    </IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>Type: {a.type}</p>
                    {a.institution ? <p>Institution: {a.institution}</p> : null}
                    {a.numberMasked ? <p>Number: {a.numberMasked}</p> : null}
                    <p><strong>Balance: {formatCurrency(a.balanceCurrent)}</strong></p>
                    <IonText color="medium">
                      <p style={{ marginTop: 4 }}>Updated {a.updatedAt ? formatDateTime(a.updatedAt) : a.createdAt ? formatDateTime(a.createdAt) : '—'}</p>
                    </IonText>
                    {a.type === 'credit' && a.creditLimit != null ? (
                      <div>
                        <p>Credit Limit: {formatCurrency(a.creditLimit)}</p>
                        {(() => {
                          const max = Math.max(1, a.creditLimit || 1);
                          const val = Math.min(max, Math.max(0, a.balanceCurrent));
                          const pct = Math.round((val / max) * 100);
                          return (
                            <div
                              className="progress"
                              role="progressbar"
                              aria-label="Credit usage"
                              aria-valuemin={0}
                              aria-valuemax={max}
                              aria-valuenow={val}
                            >
                              <span style={{ width: `${pct}%` }} />
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonModal isOpen={isModalOpen} onDidDismiss={closeModal} breakpoints={[0, 0.5, 0.9]} initialBreakpoint={0.9}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{title}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeModal}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Name</IonLabel>
              <IonInput value={form.name} onIonInput={(e) => setForm((p) => ({ ...p, name: e.detail.value ?? '' }))} disabled={mode === 'edit'} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Type</IonLabel>
              <IonSelect value={form.type} onIonChange={(e) => setForm((p) => ({ ...p, type: (e.detail.value as AccountType) ?? p.type }))} disabled={mode === 'edit'}>
                <IonSelectOption value="bank">Bank</IonSelectOption>
                <IonSelectOption value="ewallet">eWallet</IonSelectOption>
                <IonSelectOption value="cash">Cash</IonSelectOption>
                <IonSelectOption value="credit">Credit</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Institution (optional)</IonLabel>
              <IonInput value={form.institution} onIonInput={(e) => setForm((p) => ({ ...p, institution: e.detail.value ?? '' }))} disabled={mode === 'edit'} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Number (masked)</IonLabel>
              <IonInput value={form.numberMasked} onIonInput={(e) => setForm((p) => ({ ...p, numberMasked: e.detail.value ?? '' }))} disabled={mode === 'edit'} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Current Balance</IonLabel>
              <IonInput type="number" inputmode="decimal" value={form.balanceCurrent} onIonInput={(e) => setForm((p) => ({ ...p, balanceCurrent: e.detail.value ?? p.balanceCurrent }))} />
            </IonItem>
            {form.type === 'credit' ? (
              <IonItem>
                <IonLabel position="stacked">Credit Limit</IonLabel>
                <IonInput type="number" inputmode="decimal" value={form.creditLimit} onIonInput={(e) => setForm((p) => ({ ...p, creditLimit: e.detail.value ?? '' }))} disabled={mode === 'edit'} />
              </IonItem>
            ) : null}

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
