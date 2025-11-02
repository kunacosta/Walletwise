export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
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
  category: string;
  subcategory: string;
  note?: string;
  date: Date;
}

export type TransactionPatch = Partial<Omit<Transaction, 'id'>>;
