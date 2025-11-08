import { create } from 'zustand';
import { getCached, setCached } from '../lib/cache';
import { appProKey, appSettingsKey } from '../constants/cacheKeys';

export type BufferMode = 'fixed' | 'percent' | 'none';
export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  spendWindowDays: number; // default 14 days
  bufferMode: BufferMode; // 'fixed' | 'percent' | 'none'
  bufferValue: number; // RM value for fixed buffer
  bufferPercent: number; // percent if bufferMode === 'percent'
  includeCreditInSpendable: boolean; // default false
  includeAccountIds: string[] | null; // null means include all (subject to includeCreditInSpendable)
  notificationsEnabled: boolean;
  quietHoursStart: string | null; // '22:00'
  quietHoursEnd: string | null; // '07:00'
  setNotificationsEnabled: (v: boolean) => void;
  // Pro simulation
  isPro: boolean;
  proExpiresAt: Date | null;
  setPro: (enabled: boolean, expiresAt?: Date | null) => Promise<void>;
  hydrate: () => Promise<void>;
  // Appearance
  theme: ThemeMode;
  currency: string; // ISO 4217, e.g., 'USD'
  firstDayOfWeek: 0 | 1; // 0=Sun,1=Mon
  setSpendWindowDays: (days: number) => void;
  setBufferMode: (mode: BufferMode) => void;
  setBufferValue: (value: number) => void;
  setBufferPercent: (value: number) => void;
  setIncludeCreditInSpendable: (v: boolean) => void;
  setIncludeAccountIds: (ids: string[] | null) => void;
  setTheme: (mode: ThemeMode) => void;
  setCurrency: (code: string) => void;
  setFirstDayOfWeek: (v: 0 | 1) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  spendWindowDays: 14,
  bufferMode: 'fixed',
  bufferValue: 50,
  bufferPercent: 10,
  includeCreditInSpendable: false,
  includeAccountIds: null,
  notificationsEnabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  setNotificationsEnabled: (v) => { set({ notificationsEnabled: v }); void persist(); },
  isPro: false,
  proExpiresAt: null,
  setPro: async (enabled, expiresAt) => {
    const payload = {
      isPro: Boolean(enabled),
      proExpiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
    await setCached(appProKey(), payload);
    set({ isPro: payload.isPro, proExpiresAt: expiresAt ?? null });
  },
  hydrate: async () => {
    try {
      const raw = await getCached<{ isPro?: boolean; proExpiresAt?: string | null }>(appProKey());
      if (raw) {
        const exp = raw.proExpiresAt ? new Date(raw.proExpiresAt) : null;
        const now = new Date();
        const active = Boolean(raw.isPro) && (!exp || exp.getTime() > now.getTime());
        set({ isPro: active, proExpiresAt: exp && active ? exp : null });
      }
      const settings = await getCached<any>(appSettingsKey());
      if (settings) {
        set({
          spendWindowDays: settings.spendWindowDays ?? 14,
          bufferMode: settings.bufferMode ?? 'fixed',
          bufferValue: settings.bufferValue ?? 50,
          bufferPercent: settings.bufferPercent ?? 10,
          includeCreditInSpendable: Boolean(settings.includeCreditInSpendable),
          includeAccountIds: settings.includeAccountIds ?? null,
          notificationsEnabled: settings.notificationsEnabled ?? true,
          quietHoursStart: settings.quietHoursStart ?? null,
          quietHoursEnd: settings.quietHoursEnd ?? null,
          theme: (settings.theme ?? 'system') as ThemeMode,
          currency: settings.currency ?? 'USD',
          firstDayOfWeek: (settings.firstDayOfWeek ?? 0) as 0 | 1,
        });
      }
    } catch {
      // ignore
    }
  },
  theme: 'system',
  currency: 'USD',
  firstDayOfWeek: 0,
  setSpendWindowDays: (days) => set({ spendWindowDays: Math.max(0, Math.floor(days)) }),
  setBufferMode: (mode) => { set({ bufferMode: mode }); void persist(); },
  setBufferValue: (value) => { set({ bufferValue: Math.max(0, Number(value)) }); void persist(); },
  setBufferPercent: (value) => { set({ bufferPercent: Math.max(0, Number(value)) }); void persist(); },
  setIncludeCreditInSpendable: (v) => { set({ includeCreditInSpendable: v }); void persist(); },
  setIncludeAccountIds: (ids) => { set({ includeAccountIds: ids }); void persist(); },
  setTheme: (mode) => { set({ theme: mode }); void persist(); },
  setCurrency: (code) => { set({ currency: code }); void persist(); },
  setFirstDayOfWeek: (v) => { set({ firstDayOfWeek: v }); void persist(); },
}));

const persist = async () => {
  const s = useSettings.getState();
  try {
    await setCached(appSettingsKey(), {
      spendWindowDays: s.spendWindowDays,
      bufferMode: s.bufferMode,
      bufferValue: s.bufferValue,
      bufferPercent: s.bufferPercent,
      includeCreditInSpendable: s.includeCreditInSpendable,
      includeAccountIds: s.includeAccountIds,
      notificationsEnabled: s.notificationsEnabled,
      quietHoursStart: s.quietHoursStart,
      quietHoursEnd: s.quietHoursEnd,
      theme: s.theme,
      currency: s.currency,
      firstDayOfWeek: s.firstDayOfWeek,
    });
  } catch {
    // ignore
  }
};
