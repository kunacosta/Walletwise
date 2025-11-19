export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  accountId?: string; // optional link to account
  category: string;
  subcategory?: string;
  note?: string;
  // Optional native-enhanced metadata
  // Receipts captured via Camera / Filesystem
  receiptUrl?: string;
  // Location attached via Geolocation
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  date: Date;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  // client-only: true when write not yet acknowledged by server
  pending?: boolean;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  accountId?: string;
  category: string;
  subcategory?: string;
  note?: string;
  receiptUrl?: string;
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  date: Date;
}

export type TransactionPatch = Partial<Omit<Transaction, 'id'>>;
