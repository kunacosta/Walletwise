export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  accountId?: string; // optional link to account
  category: string;
  subcategory: string;
  note?: string;
  date: Date;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  accountId?: string;
  category: string;
  subcategory: string;
  note?: string;
  date: Date;
}

export type TransactionPatch = Partial<Omit<Transaction, 'id'>>;
