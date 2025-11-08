export const CACHE_PREFIX = 'walletwise:v1';

export const cacheKey = (...parts: string[]): string => [CACHE_PREFIX, ...parts].join(':');

export const userTransactionsKey = (uid: string): string => cacheKey('transactions', uid);
export const userAccountsKey = (uid: string): string => cacheKey('accounts', uid);
export const userBillsKey = (uid: string): string => cacheKey('bills', uid);
export const userCategoriesKey = (uid: string): string => cacheKey('categories', uid);
export const appProKey = (): string => cacheKey('pro');
export const appSettingsKey = (): string => cacheKey('settings');
