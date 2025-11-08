import { Storage } from '@ionic/storage';

let storage: Storage | null = null;

const getStorage = async (): Promise<Storage> => {
  if (!storage) {
    storage = new Storage({ name: 'walletwise', storeName: 'app' });
    await storage.create();
  }
  return storage;
};

export const getCached = async <T>(key: string): Promise<T | null> => {
  const s = await getStorage();
  const value = (await s.get(key)) as T | null;
  return value ?? null;
};

export const setCached = async <T>(key: string, value: T): Promise<void> => {
  const s = await getStorage();
  await s.set(key, value as unknown);
};

export const removeCached = async (key: string): Promise<void> => {
  const s = await getStorage();
  await s.remove(key);
};

