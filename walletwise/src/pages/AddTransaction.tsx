import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonButtons,
  IonButton,
  IonBackButton,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonPopover,
  IonText,
  IonToast,
  IonNote,
} from '@ionic/react';
import { IonHeader, IonToolbar, IonTitle, IonInput, IonIcon } from '@ionic/react';
import { backspaceOutline, calendarOutline } from 'ionicons/icons';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import { useCategories } from '../features/categories/useCategories';
import type { TransactionInput, TransactionType } from '../types/transaction';
import type { CategoryType } from '../types/category';
import { addTransaction, addTransfer } from '../services/db';
import { Money } from '../components/ui/Money';
import { useHistory } from 'react-router-dom';

const KeyButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" className="add-txn-key" onClick={onClick} aria-label={label}>
    {label}
  </button>
);

type Mode = TransactionType | 'transfer';

export const AddTransaction: React.FC = () => {
  const { user } = useAuthStore();
  const history = useHistory();
  const { items: accounts } = useAccounts(user?.uid, { isPro: false });
  useCategories(user?.uid);

  const [mode, setMode] = useState<Mode>('expense');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(new Date().toISOString());
  const [note, setNote] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' } | null>(null);
  const [isDateOpen, setIsDateOpen] = useState<boolean>(false);
  const [dateEvent, setDateEvent] = useState<Event | undefined>(undefined);

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return 'Select Date';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Select Date';
    }
  }, [dateIso]);

  // Derive categories for current mode
  const typeKey: CategoryType = mode === 'transfer' ? 'expense' : mode;

  // Read URL params (date, mode, category) once on mount.
  // Using window.location ensures this also works inside the Capacitor shell.
  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);

    const date = params.get('date');
    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) setDateIso(d.toISOString());
    }

    const modeParam = params.get('mode') as Mode | null;
    if (modeParam === 'income' || modeParam === 'expense' || modeParam === 'transfer') {
      setMode(modeParam);
    }

    const categoryParam = params.get('category');
    if (categoryParam) {
      setCategory(categoryParam);
    }
  }, []);

  // Default accounts
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
    if (!toAccountId && accounts.length > 1) setToAccountId(accounts[1].id);
  }, [accounts, accountId, toAccountId]);

  // Reset category when switching to transfer mode; otherwise keep whatever
  // the user picked (including values coming from the picker URL).
  useEffect(() => {
    if (mode === 'transfer') {
      setCategory('');
    }
  }, [mode]);

  const disabled =
    accounts.length === 0 ||
    (mode === 'transfer' && (accounts.length < 2 || !accountId || !toAccountId || accountId === toAccountId));

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
          subcategory: '',
          note: note || undefined,
          date: new Date(dateIso),
        };
        await addTransaction(payload);
        setToast({ message: 'Transaction added', color: 'success' });
      }
      history.replace('/transactions');
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
            <IonBackButton defaultHref="/transactions" text="" />
          </IonButtons>
          <IonTitle>Add Transaction</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding add-txn-content">
        <div className="container-narrow">
          <div className="add-txn-segment" aria-label="Select transaction type">
            <IonSegment
              value={mode}
              onIonChange={(e) => setMode(((e.detail.value as string) as Mode) ?? 'expense')}
            >
              <IonSegmentButton value="income">INCOME</IonSegmentButton>
              <IonSegmentButton value="expense">EXPENSE</IonSegmentButton>
              <IonSegmentButton value="transfer">TRANSFER</IonSegmentButton>
            </IonSegment>
          </div>

          {accounts.length === 0 ? (
            <IonText color="medium">
              <p className="add-txn-empty-state">
                You need an account before adding transactions. Go to Accounts and create one.
              </p>
            </IonText>
          ) : null}

          <div className="add-txn-card add-txn-amount">
            <IonText color="medium">
              <p className="add-txn-amount-label">Amount</p>
            </IonText>
            <div className={`add-txn-amount-value add-txn-amount-${amountTone}`} aria-live="polite">
              <Money
                value={amount}
                signed={amount > 0 && mode !== 'transfer'}
                type={amountTone === 'neutral' ? 'neutral' : amountTone}
              />
            </div>
          </div>

          <IonList
            inset
            lines="none"
            className={`add-txn-card ${mode === 'transfer' ? 'add-txn-form-transfer' : 'add-txn-form'}`}
          >
            {mode === 'transfer' ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">From account</IonLabel>
                  <IonSelect
                    value={accountId}
                    onIonChange={(e) => setAccountId((e.detail.value as string) ?? accountId)}
                    interface="popover"
                    disabled={accounts.length === 0}
                  >
                    {accounts.map((a) => (
                      <IonSelectOption key={a.id} value={a.id}>
                        {a.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">To account</IonLabel>
                  <IonSelect
                    value={toAccountId}
                    onIonChange={(e) => setToAccountId((e.detail.value as string) ?? toAccountId)}
                    interface="popover"
                    disabled={accounts.length < 2}
                  >
                    {accounts.map((a) => (
                      <IonSelectOption key={a.id} value={a.id}>
                        {a.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              </>
            ) : (
              <>
                <IonItem>
                  <IonLabel position="stacked">Account</IonLabel>
                  <IonSelect
                    value={accountId}
                    onIonChange={(e) => setAccountId((e.detail.value as string) ?? accountId)}
                    interface="popover"
                    disabled={accounts.length === 0}
                  >
                    {accounts.map((a) => (
                      <IonSelectOption key={a.id} value={a.id}>
                        {a.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem
                  button
                  detail
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('mode', typeKey);
                    if (category) params.set('category', category);
                    params.set('returnTo', '/transactions/new');
                    // preserve currently selected date so it survives round-trip
                    if (dateIso) params.set('date', dateIso);
                    history.push(`/categories/select?${params.toString()}`);
                  }}
                >
                  <IonLabel position="stacked">Category</IonLabel>
                  <IonText
                    className={
                      category
                        ? 'add-txn-category-text'
                        : 'add-txn-category-text add-txn-category-text--placeholder'
                    }
                  >
                    {category || 'Choose category'}
                  </IonText>
                </IonItem>
                <IonItem className="add-txn-note-item">
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
          </IonList>

          <div className="add-txn-date-row">
            <IonButton
              fill="outline"
              onClick={(e) => {
                setDateEvent((e as any).nativeEvent as Event);
                setIsDateOpen(true);
              }}
            >
              <IonIcon slot="start" icon={calendarOutline} /> {dateLabel}
            </IonButton>
          </div>

          <IonPopover
            isOpen={isDateOpen}
            event={dateEvent}
            onDidDismiss={() => setIsDateOpen(false)}
            style={{ ['--width' as any]: '320px' }}
          >
            <IonDatetime
              presentation="date"
              value={dateIso}
              onIonChange={(e) => {
                const v = e.detail.value as string;
                if (v) setDateIso(v);
                setIsDateOpen(false);
              }}
            />
          </IonPopover>

          <div className="add-txn-keypad">
            <div className="add-txn-key-grid">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'].map((key) => (
                <KeyButton key={key} label={key} onClick={() => append(key)} />
              ))}
              <button
                type="button"
                className="add-txn-key"
                onClick={backspace}
                aria-label="Backspace"
              >
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

          <IonToast
            isOpen={toast !== null}
            message={toast?.message}
            color={toast?.color}
            duration={2200}
            onDidDismiss={() => setToast(null)}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};
