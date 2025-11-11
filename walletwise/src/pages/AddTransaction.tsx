import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonButtons,
  IonButton,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonText,
  IonToast,
  IonNote,
} from '@ionic/react';
import { IonHeader, IonToolbar, IonTitle, IonInput, IonIcon } from '@ionic/react';
import { backspaceOutline } from 'ionicons/icons';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import { useCategories } from '../features/categories/useCategories';
import type { TransactionInput, TransactionType } from '../types/transaction';
import type { Category, CategoryType } from '../types/category';
import { addTransaction } from '../services/db';
import { addTransfer } from '../services/db';
import { Money } from '../components/ui/Money';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router';
// import { PageHeader } from '../components/PageHeader';

const KeyButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" className="add-txn-key" onClick={onClick} aria-label={label}>
    {label}
  </button>
);

type Mode = TransactionType | 'transfer';

export const AddTransaction: React.FC = () => {
  const { user } = useAuthStore();
  const history = useHistory();
  const location = useLocation();
  const { items: accounts } = useAccounts(user?.uid, { isPro: false });
  const { items: categoriesAll } = useCategories(user?.uid);

  const [mode, setMode] = useState<Mode>('expense');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(new Date().toISOString());
  const [note, setNote] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' } | null>(null);

  const categories = useMemo(() => {
    const typeKey: CategoryType = mode === 'transfer' ? 'expense' : mode;
    const filtered = categoriesAll.filter((c) => c.type === typeKey);
    if (filtered.length > 0) return filtered;
    const fallbackName = typeKey === 'income' ? 'Income' : 'General';
    const fallback: Category = {
      id: `fallback-${typeKey}`,
      name: fallbackName,
      type: typeKey,
      subcategories: ['General'],
      isSystem: true,
    };
    return [fallback];
  }, [categoriesAll, mode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const date = params.get('date');
    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) setDateIso(d.toISOString());
    }
  }, [location.search]);

  useEffect(() => {
    // Set defaults when accounts load
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
    if (!toAccountId && accounts.length > 1) setToAccountId(accounts[1].id);
  }, [accounts, accountId, toAccountId]);

  useEffect(() => {
    if (mode === 'transfer') {
      setCategory('');
      setSubcategory('');
      return;
    }
    if (categories.length === 0) {
      setCategory('');
      setSubcategory('');
      return;
    }
    setCategory((current) => (categories.some((c) => c.name === current) ? current : categories[0].name));
  }, [categories, mode]);

  useEffect(() => {
    if (!category) {
      setSubcategory('');
      return;
    }
    const selected = categories.find((c) => c.name === category);
    const subs = selected?.subcategories ?? [];
    setSubcategory((current) => (current && subs.includes(current) ? current : subs[0] ?? ''));
  }, [category, categories]);

  const disabled = accounts.length === 0 || (mode === 'transfer' && (accounts.length < 2 || !accountId || !toAccountId || accountId === toAccountId));

  const append = (ch: string) => {
    setAmountStr((prev) => {
      if (ch === '.' && prev.includes('.')) return prev;
      const next = prev === '0' && ch !== '.' ? ch : prev + ch;
      return next.slice(0, 14);
    });
  };
  const backspace = () => setAmountStr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  const clear = () => setAmountStr('0');

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!accountId) {
      setToast({ message: 'Please create/select an account first.', color: 'danger' });
      return;
    }
    if (!(amount > 0)) {
      setToast({ message: 'Enter an amount greater than zero.', color: 'danger' });
      return;
    }
    if (mode !== 'transfer' && !category) {
      setToast({ message: 'Select a category first.', color: 'danger' });
      return;
    }
    try {
      if (mode === 'transfer') {
        if (!toAccountId || accountId === toAccountId) {
          setToast({ message: 'Pick two different accounts.', color: 'danger' });
          return;
        }
        await addTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount,
          date: new Date(dateIso),
          note: note || undefined,
        });
        setToast({ message: 'Transfer recorded', color: 'success' });
      } else {
        const payload: TransactionInput = {
          type: mode,
          amount,
          accountId,
          category,
          subcategory,
          note: note || undefined,
          date: new Date(dateIso),
        };
        await addTransaction(payload);
        setToast({ message: 'Transaction added', color: 'success' });
      }
      history.replace('/ledger');
    } catch (e: any) {
      setToast({ message: e?.message ?? 'Failed to save', color: 'danger' });
    }
  };

  const amount = parseFloat(amountStr || '0') || 0;
  const amountTone: 'neutral' | 'income' | 'expense' =
    amount === 0 || mode === 'transfer'
      ? 'neutral'
      : mode === 'income'
      ? 'income'
      : 'expense';
  const missingCategory = mode !== 'transfer' && !category;
  const saveDisabled =
    disabled ||
    amount <= 0 ||
    missingCategory ||
    (mode === 'transfer' && (!toAccountId || accountId === toAccountId));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>Add Transaction</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding add-txn-content">
        {/* Narrow container keeps content centered and readable on mobile */}
        <div className="container-narrow">

        <IonSegment value={mode} onIonChange={(e) => setMode(((e.detail.value as string) as Mode) ?? 'expense')}>
          <IonSegmentButton value="income">INCOME</IonSegmentButton>
          <IonSegmentButton value="expense">EXPENSE</IonSegmentButton>
          <IonSegmentButton value="transfer">TRANSFER</IonSegmentButton>
        </IonSegment>

        {accounts.length === 0 ? (
          <IonText color="medium">
            <p className="add-txn-empty-state">You need an account before adding transactions. Go to Accounts and create one.</p>
          </IonText>
        ) : null}

        <div className="add-txn-card add-txn-amount">
          <IonText color="medium"><p className="add-txn-amount-label">Amount</p></IonText>
          <div className={`add-txn-amount-value add-txn-amount-${amountTone}`} aria-live="polite">
            <Money value={amount} signed={amount > 0 && mode !== 'transfer'} type={amountTone === 'neutral' ? 'neutral' : amountTone} />
          </div>
        </div>

        <IonList inset lines="none" className="add-txn-card add-txn-form">
          {mode === 'transfer' ? (
            <>
              <IonItem>
                <IonLabel position="stacked">From account</IonLabel>
                <IonSelect value={accountId} onIonChange={(e) => setAccountId((e.detail.value as string) ?? accountId)} interface="popover" disabled={accounts.length === 0}>
                  {accounts.map((a) => (
                    <IonSelectOption key={a.id} value={a.id}>{a.name}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">To account</IonLabel>
                <IonSelect value={toAccountId} onIonChange={(e) => setToAccountId((e.detail.value as string) ?? toAccountId)} interface="popover" disabled={accounts.length < 2}>
                  {accounts.map((a) => (
                    <IonSelectOption key={a.id} value={a.id}>{a.name}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </>
          ) : (
            <>
              <IonItem>
                <IonLabel position="stacked">Account</IonLabel>
                <IonSelect value={accountId} onIonChange={(e) => setAccountId((e.detail.value as string) ?? accountId)} interface="popover" disabled={accounts.length === 0}>
                  {accounts.map((a) => (
                    <IonSelectOption key={a.id} value={a.id}>{a.name}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Category</IonLabel>
                <IonSelect
                  value={category || undefined}
                  placeholder="Select category"
                  onIonChange={(e) => setCategory((e.detail.value as string) ?? '')}
                  interface="popover"
                >
                  {categories.map((c) => (
                    <IonSelectOption key={c.id} value={c.name}>{c.name}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Subcategory</IonLabel>
                <IonSelect
                  value={subcategory || undefined}
                  placeholder={category ? 'Select subcategory' : 'Choose a category first'}
                  onIonChange={(e) => setSubcategory((e.detail.value as string) ?? '')}
                  interface="popover"
                  disabled={!category}
                >
                  {(categories.find((c) => c.name === category)?.subcategories ?? []).map((s) => (
                    <IonSelectOption key={s} value={s}>{s}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Note</IonLabel>
                <IonInput
                  value={note}
                  maxlength={120}
                  placeholder="Optional notes"
                  onIonInput={(e) => setNote(e.detail.value ?? '')}
                />
              </IonItem>
            </>
          )}
          <IonItem>
            <IonLabel position="stacked">Date</IonLabel>
            <div className="add-txn-date-chip">
              <IonDatetimeButton datetime="add-txn-date" />
            </div>
          </IonItem>
        </IonList>

        <IonModal keepContentsMounted={true}>
          <IonDatetime id="add-txn-date" presentation="date" value={dateIso} onIonChange={(e) => setDateIso((e.detail.value as string) ?? dateIso)} />
        </IonModal>

        {/* On-screen keypad for quick amount entry */}
        <div className="add-txn-keypad">
          <div className="add-txn-key-grid">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'].map((key) => (
              <KeyButton key={key} label={key} onClick={() => append(key)} />
            ))}
            <button type="button" className="add-txn-key" onClick={backspace} aria-label="Backspace">
              <IonIcon icon={backspaceOutline} />
            </button>
            </div>
          <div className="add-txn-actions">
            <IonButton expand="block" fill="outline" color="medium" onClick={clear}>
              Clear
            </IonButton>
            <IonButton
              expand="block"
              color={mode === 'income' ? 'success' : mode === 'expense' ? 'danger' : 'primary'}
              onClick={handleSave}
              disabled={saveDisabled}
            >
              Save Transaction

            </IonButton>
          </div>
          <IonNote color="medium" className="add-txn-hint">
            Tap the keypad to enter an amount, then choose the account and category.
          </IonNote>
        </div>

        <IonToast isOpen={toast !== null} message={toast?.message} color={toast?.color} duration={2200} onDidDismiss={() => setToast(null)} />
        </div>
      </IonContent>
    </IonPage>
  );
};


