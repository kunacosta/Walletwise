import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  IonButtons,
} from '@ionic/react';
import type { Transaction, TransactionInput, TransactionType } from '../types/transaction';
import { addTransaction, updateTransaction } from '../services/db';
import { useTxnStore } from '../state/useTxnStore';

const CATEGORY_OPTIONS: Record<
  TransactionType,
  Array<{ value: string; label: string; subcategories: string[] }>
> = {
  income: [
    { value: 'Salary', label: 'Salary', subcategories: ['Base Pay', 'Bonus', 'Commission'] },
    { value: 'Investments', label: 'Investments', subcategories: ['Dividends', 'Interest', 'Gains'] },
    { value: 'Side Hustle', label: 'Side Hustle', subcategories: ['Freelance', 'Rental', 'Marketplace'] },
    { value: 'Other Income', label: 'Other Income', subcategories: ['Gift', 'Refund', 'Misc'] },
  ],
  expense: [
    { value: 'Housing', label: 'Housing', subcategories: ['Rent', 'Mortgage', 'Utilities'] },
    { value: 'Food', label: 'Food', subcategories: ['Groceries', 'Dining', 'Coffee'] },
    { value: 'Transport', label: 'Transport', subcategories: ['Fuel', 'Ride Share', 'Transit'] },
    { value: 'Lifestyle', label: 'Lifestyle', subcategories: ['Shopping', 'Travel', 'Entertainment'] },
    { value: 'Other Expense', label: 'Other Expense', subcategories: ['Medical', 'Education', 'Misc'] },
  ],
};

interface TxnModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  transaction?: Transaction;
  onDismiss: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface FormState {
  type: TransactionType;
  amount: string;
  category: string;
  subcategory: string;
  note: string;
  dateIso: string;
}

const buildInitialState = (transaction?: Transaction): FormState => {
  const baseDate = transaction?.date ?? new Date();
  const type = transaction?.type ?? 'expense';
  const categories = CATEGORY_OPTIONS[type];
  const defaultCategory = transaction?.category ?? categories[0]?.value ?? 'General';
  const defaultSub = transaction?.subcategory ?? categories[0]?.subcategories[0] ?? 'General';

  return {
    type,
    amount: transaction ? transaction.amount.toString() : '',
    category: defaultCategory,
    subcategory: defaultSub,
    note: transaction?.note ?? '',
    dateIso: baseDate.toISOString(),
  };
};

export const TxnModal: React.FC<TxnModalProps> = ({
  isOpen,
  mode,
  transaction,
  onDismiss,
  onSuccess,
  onError,
}) => {
  const [form, setForm] = useState<FormState>(buildInitialState(transaction));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addLocal = useTxnStore((state) => state.addLocal);
  const updateLocal = useTxnStore((state) => state.updateLocal);
  const removeLocal = useTxnStore((state) => state.removeLocal);
  const setStoreError = useTxnStore((state) => state.setError);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(transaction));
      setFormError(null);
    }
  }, [isOpen, transaction]);

  const availableCategories = useMemo(
    () => CATEGORY_OPTIONS[form.type],
    [form.type],
  );

  useEffect(() => {
    if (!availableCategories.some((item) => item.value === form.category)) {
      const fallback = availableCategories[0];
      setForm((prev) => ({
        ...prev,
        category: fallback?.value ?? 'General',
        subcategory: fallback?.subcategories[0] ?? 'General',
      }));
    }
  }, [availableCategories, form.category]);

  useEffect(() => {
    const categoryConfig = availableCategories.find((c) => c.value === form.category);
    if (categoryConfig && !categoryConfig.subcategories.includes(form.subcategory)) {
      setForm((prev) => ({
        ...prev,
        subcategory: categoryConfig.subcategories[0] ?? 'General',
      }));
    }
  }, [availableCategories, form.category, form.subcategory]);

  const handleTypeChange = (value: string) => {
    if (value === 'income' || value === 'expense') {
      const categories = CATEGORY_OPTIONS[value];
      setForm((prev) => ({
        ...prev,
        type: value,
        category: categories[0]?.value ?? 'General',
        subcategory: categories[0]?.subcategories[0] ?? 'General',
      }));
    }
  };

  const validate = (): TransactionInput | null => {
    const amountValue = Number.parseFloat(form.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError('Amount must be greater than zero.');
      return null;
    }

    if (!['income', 'expense'].includes(form.type)) {
      setFormError('Transaction type is invalid.');
      return null;
    }

    if (!form.dateIso) {
      setFormError('Date is required.');
      return null;
    }

    const date = new Date(form.dateIso);
    if (Number.isNaN(date.getTime())) {
      setFormError('Date is invalid.');
      return null;
    }

    const trimmedCategory = form.category.trim();
    const trimmedSubcategory = form.subcategory.trim();

    const payload: TransactionInput = {
      type: form.type,
      amount: Number(amountValue.toFixed(2)),
      category: trimmedCategory.length > 0 ? trimmedCategory : 'General',
      subcategory: trimmedSubcategory.length > 0 ? trimmedSubcategory : 'General',
      note: form.note.trim() || undefined,
      date,
    };

    setFormError(null);
    return payload;
  };

  const handleSubmit = async () => {
    const payload = validate();
    if (!payload) {
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const tempId = `temp-${Date.now()}`;
        addLocal({
          id: tempId,
          ...payload,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        try {
          await addTransaction(payload);
          removeLocal(tempId);
          setStoreError(null);
          onSuccess('Transaction added');
          onDismiss();
        } catch (error) {
          removeLocal(tempId);
          const message = error instanceof Error ? error.message : 'Failed to add transaction.';
          setStoreError(message);
          onError(message);
        }
      } else if (transaction) {
        const original = { ...transaction };
        updateLocal(transaction.id, {
          ...payload,
          updatedAt: new Date(),
        });
        try {
          await updateTransaction(transaction.id, payload);
          setStoreError(null);
          onSuccess('Transaction updated');
          onDismiss();
        } catch (error) {
          updateLocal(transaction.id, {
            type: original.type,
            amount: original.amount,
            category: original.category,
            subcategory: original.subcategory,
            note: original.note,
            date: original.date,
            updatedAt: original.updatedAt ?? new Date(),
          });
          const message = error instanceof Error ? error.message : 'Failed to update transaction.';
          setStoreError(message);
          onError(message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} breakpoints={[0, 0.45, 0.8]} initialBreakpoint={0.8}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss} disabled={submitting}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonTitle>{mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSubmit} disabled={submitting}>
              {mode === 'create' ? 'Add' : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonSegment
          value={form.type}
          onIonChange={(event) => handleTypeChange(event.detail.value as string)}
        >
          <IonSegmentButton value="income">Income</IonSegmentButton>
          <IonSegmentButton value="expense">Expense</IonSegmentButton>
        </IonSegment>

        <IonList inset>
          <IonItem>
            <IonLabel position="stacked">Amount</IonLabel>
            <IonInput
              type="number"
              inputmode="decimal"
              value={form.amount}
              placeholder="0.00"
              min="0"
              step="0.01"
              onIonInput={(event) => setForm((prev) => ({ ...prev, amount: event.detail.value ?? '' }))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Date</IonLabel>
            <IonDatetimeButton datetime="ledger-txn-date" />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Category</IonLabel>
            <IonSelect
              value={form.category}
              onIonChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  category: (event.detail.value as string) ?? prev.category,
                }))
              }
            >
              {availableCategories.map((cat) => (
                <IonSelectOption key={cat.value} value={cat.value}>
                  {cat.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Subcategory</IonLabel>
            <IonSelect
              value={form.subcategory}
              onIonChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  subcategory: (event.detail.value as string) ?? prev.subcategory,
                }))
              }
            >
              {(availableCategories.find((cat) => cat.value === form.category)?.subcategories ?? []).map(
                (sub) => (
                  <IonSelectOption key={sub} value={sub}>
                    {sub}
                  </IonSelectOption>
                ),
              )}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Note</IonLabel>
            <IonInput
              value={form.note}
              maxlength={120}
              placeholder="Optional"
              onIonInput={(event) => setForm((prev) => ({ ...prev, note: event.detail.value ?? '' }))}
            />
          </IonItem>
        </IonList>

        <IonModal keepContentsMounted={true}>
          <IonDatetime
            id="ledger-txn-date"
            presentation="date"
            value={form.dateIso}
            onIonChange={(event) =>
              setForm((prev) => ({ ...prev, dateIso: (event.detail.value as string) ?? prev.dateIso }))
            }
          />
        </IonModal>

        {formError ? (
          <IonText color="danger">
            <p role="alert">{formError}</p>
          </IonText>
        ) : null}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton expand="block" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : mode === 'create' ? 'Add Transaction' : 'Save Changes'}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};
