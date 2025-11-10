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
} from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { useAccounts } from '../features/accounts/useAccounts';
import { useCategories } from '../features/categories/useCategories';
import type { TransactionInput, TransactionType } from '../types/transaction';
import { addTransaction } from '../services/db';
import { addTransfer } from '../services/db';
import { Money } from '../components/ui/Money';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router';
import { PageHeader } from '../components/PageHeader';

const KeyButton: React.FC<{ label: string; onClick: () => void; grow?: boolean }> = ({ label, onClick, grow }) => (
  <button
    onClick={onClick}
    style={{
      flex: grow ? 2 : 1,
      padding: 16,
      fontSize: 22,
      background: 'var(--ion-color-step-50, #f3f3f3)',
      border: 'none',
      borderRadius: 8,
    }}
  >
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
  const [category, setCategory] = useState<string>('General');
  const [subcategory, setSubcategory] = useState<string>('General');
  const [dateIso, setDateIso] = useState<string>(new Date().toISOString());
  const [note] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' } | null>(null);

  const categories = useMemo(() => categoriesAll.filter((c) => c.type === (mode === 'transfer' ? 'expense' : mode)), [categoriesAll, mode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const date = params.get('date');
    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) setDateIso(d.toISOString());
    }
  }, [location.search]);

  useEffect(() => {
    // Set defaults when accounts/categories load
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
    if (!toAccountId && accounts.length > 1) setToAccountId(accounts[1].id);
    if (categories.length > 0) {
      const first = categories[0];
      const subs = first.subcategories ?? ['General'];
      setCategory((c) => (categories.some((x) => x.name === c) ? c : first.name));
      setSubcategory((s) => (subs.includes(s) ? s : subs[0]));
    }
  }, [accounts, categories, accountId, toAccountId]);

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

  return (
    <IonPage>
      <PageHeader
        title="Add Transaction"
        start={<IonButton onClick={() => history.goBack()}>Cancel</IonButton>}
        end={<IonButton onClick={handleSave} disabled={disabled}>Save</IonButton>}
      />
      <IonContent className="ion-padding">
        <IonSegment value={mode} onIonChange={(e) => setMode(((e.detail.value as string) as Mode) ?? 'expense')}>
          <IonSegmentButton value="income">INCOME</IonSegmentButton>
          <IonSegmentButton value="expense">EXPENSE</IonSegmentButton>
          <IonSegmentButton value="transfer">TRANSFER</IonSegmentButton>
        </IonSegment>

        {disabled ? (
          <IonText color="medium">
            <p style={{ marginTop: 16 }}>You need an account before adding transactions. Go to Accounts and create one.</p>
          </IonText>
        ) : null}

        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <IonText color="medium"><p style={{ margin: 0 }}>Amount</p></IonText>
          <div style={{ fontSize: 40, fontWeight: 800 }}>
            <Money value={parseFloat(amountStr || '0') || 0} signed type={mode === 'income' ? 'income' : mode === 'expense' ? 'expense' : 'neutral'} />
          </div>
        </div>

        <IonList inset>
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
                <IonSelect value={accountId} onIonChange={(e) => setAccountId((e.detail.value as string) ?? accountId)} interface="popover" disabled={disabled}>
                  {accounts.map((a) => (
                    <IonSelectOption key={a.id} value={a.id}>{a.name}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Category</IonLabel>
                <IonSelect value={category} onIonChange={(e) => setCategory((e.detail.value as string) ?? category)} interface="popover">
                  {categories.map((c) => (
                    <IonSelectOption key={c.id} value={c.name}>{c.name}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Subcategory</IonLabel>
                <IonSelect value={subcategory} onIonChange={(e) => setSubcategory((e.detail.value as string) ?? subcategory)} interface="popover">
                  {(categories.find((c) => c.name === category)?.subcategories ?? ['General']).map((s) => (
                    <IonSelectOption key={s} value={s}>{s}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </>
          )}
          <IonItem>
            <IonLabel position="stacked">Date</IonLabel>
            <IonDatetimeButton datetime="add-txn-date" />
          </IonItem>
        </IonList>

        <IonModal keepContentsMounted={true}>
          <IonDatetime id="add-txn-date" presentation="date" value={dateIso} onIonChange={(e) => setDateIso((e.detail.value as string) ?? dateIso)} />
        </IonModal>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['7','8','9','4','5','6','1','2','3','.','0'].map((key) => (
              <KeyButton key={key} label={key} onClick={() => append(key)} />
            ))}
            <KeyButton label="⌫" onClick={backspace} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <KeyButton label="Clear" onClick={clear} />
            <KeyButton label="Save" onClick={handleSave} grow />
          </div>
        </div>

        <IonToast isOpen={toast !== null} message={toast?.message} color={toast?.color} duration={2200} onDidDismiss={() => setToast(null)} />
      </IonContent>
    </IonPage>
  );
};
