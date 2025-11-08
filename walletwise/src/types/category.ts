export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  subcategories?: string[];
  isSystem?: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
