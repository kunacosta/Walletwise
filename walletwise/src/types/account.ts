export type AccountType = 'bank' | 'ewallet' | 'cash' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  numberMasked?: string;
  balanceCurrent: number;
  creditLimit?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
