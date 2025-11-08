export type BillRepeat = 'none' | 'monthly' | 'yearly';
export type BillStatus = 'unpaid' | 'scheduled' | 'paid';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date; // stored as ISO in cache/Firestore
  repeat: BillRepeat;
  accountId: string;
  overrideAccountId?: string; // optional one-off/redirect
  status: BillStatus;
  lastPaidAt?: Date | null; // stored as ISO in cache/Firestore
  notes?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
