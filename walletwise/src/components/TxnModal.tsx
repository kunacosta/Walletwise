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
  useIonAlert,
} from '@ionic/react';
import type { Transaction, TransactionInput, TransactionType } from '../types/transaction';
import { addTransaction, updateTransaction, deleteTransaction } from '../services/firebase';
import { useTxnStore } from '../state/useTxnStore';
import { useAuthStore } from '../state/useAuthStore';
import { useCategories } from '../features/categories/useCategories';
import type { Category } from '../types/category';
import { formatCurrency } from '../utils/format';

// Category options are sourced from Firestore via useCategories (seeded on first run)

interface TxnModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  transaction?: Transaction;
  initialDate?: Date; // optional: prefill date for quick-add
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

const buildInitialState = (transaction?: Transaction, initialDate?: Date): FormState => {
  const baseDate = transaction?.date ?? initialDate ?? new Date();
  const type = transaction?.type ?? 'expense';
  const defaultCategory = transaction?.category ?? 'General';
  const defaultSub = transaction?.subcategory ?? 'General';

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
  initialDate,
  onDismiss,
  onSuccess,
  onError,
}) => {
  const { user } = useAuthStore();
  const { items: allCategories } = useCategories(user?.uid);
  const [presentAlert] = useIonAlert();
  const [form, setForm] = useState<FormState>(buildInitialState(transaction, initialDate));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addLocal = useTxnStore((state) => state.addLocal);
  const updateLocal = useTxnStore((state) => state.updateLocal);
  const removeLocal = useTxnStore((state) => state.removeLocal);
  const setStoreError = useTxnStore((state) => state.setError);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(transaction, initialDate));
      setFormError(null);
    }
  }, [isOpen, transaction, initialDate]);

  const availableCategories = useMemo(() => {
    const filtered = allCategories.filter((c) => c.type === form.type);
    // Fallback to a generic category if none loaded yet
    if (filtered.length === 0) {
      const generic: Category = { id: 'generic', name: 'General', type: form.type, subcategories: ['General'] };
      return [generic];
    }
    return filtered;
  }, [allCategories, form.type]);

  useEffect(() => {
    if (!availableCategories.some((item) => item.name === form.category)) {
      const fallback = availableCategories[0];
      setForm((prev) => ({
        ...prev,
        category: fallback?.name ?? 'General',
        subcategory: (fallback?.subcategories && fallback.subcategories[0]) ?? 'General',
      }));
    }
  }, [availableCategories, form.category]);

  useEffect(() => {
    const categoryConfig = availableCategories.find((c) => c.name === form.category);
    const subs = categoryConfig?.subcategories ?? [];
    if (!subs.includes(form.subcategory)) {
      setForm((prev) => ({
        ...prev,
        subcategory: subs[0] ?? 'General',
      }));
    }
  }, [availableCategories, form.category, form.subcategory]);

  const handleTypeChange = (value: string) => {
    if (value === 'income' || value === 'expense') {
      const newCats = allCategories.filter((c) => c.type === value);
      const first = newCats[0];
      setForm((prev) => ({
        ...prev,
        type: value,
        category: first?.name ?? 'General',
        subcategory: (first?.subcategories && first.subcategories[0]) ?? 'General',
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

  const handleDelete = async () => {
    if (mode !== 'edit' || !transaction) return;
    await presentAlert({
      header: 'Delete Transaction',
      message: `Delete ${transaction.category} for ${formatCurrency(transaction.amount)}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            setSubmitting(true);
            removeLocal(transaction.id);
            try {
              await deleteTransaction(transaction.id);
              setStoreError(null);
              onSuccess('Transaction deleted');
              onDismiss();
            } catch (err) {
              addLocal(transaction);
              const message = err instanceof Error ? err.message : 'Failed to delete transaction.';
              setStoreError(message);
              onError(message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} breakpoints={[0, 0.45, 0.8]} initialBreakpoint={0.8}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss} disabled={submitting}>
              Cancel
            </IonButton>
            {mode === 'edit' ? (
              <IonButton color="danger" fill="outline" onClick={handleDelete} disabled={submitting}>
                Delete
              </IonButton>
            ) : null}
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
                <IonSelectOption key={cat.id} value={cat.name}>
                  {cat.name}
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
              {(availableCategories.find((cat) => cat.name === form.category)?.subcategories ?? ['General']).map(
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
