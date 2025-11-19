import React from 'react';
import { setupIonicReact } from '@ionic/react';
import { AppRouter } from './routes/AppRouter';
import { AuthProvider } from './state/AuthProvider';
import { useAuthStore } from './state/useAuthStore';
import { useAccounts } from './features/accounts/useAccounts';
import { useBills } from './features/bills/useBills';
import { useSettings } from './state/settings';
import { ensurePermission, rescheduleAll } from './features/notifications/scheduler';
import { useSyncStatus } from './state/useSyncStatus';

setupIonicReact({
  swipeBackEnabled: true,
});

const App: React.FC = () => {
  console.log('App renders');
  const { user } = useAuthStore();
  const uid = user?.uid;
  const { items: accounts } = useAccounts(uid, { isPro: false });
  const { items: bills } = useBills(uid);
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled);
  const theme = useSettings((s) => s.theme);
  React.useEffect(() => { void useSettings.getState().hydrate(); }, []);
  React.useEffect(() => { try { useSyncStatus.getState().init(); } catch {} }, []);

  React.useEffect(() => {
    const apply = () => {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      document.body.classList.toggle('dark', isDark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => theme === 'system' && apply();
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [theme]);

  React.useEffect(() => {
    const run = async () => {
      if (!uid || !notificationsEnabled) return;
      const ok = await ensurePermission();
      if (!ok) return;
      try {
        await rescheduleAll(accounts, bills);
      } catch (e) {
        console.warn('Notification scheduling failed', e);
      }
    };
    void run();
  }, [uid, notificationsEnabled, accounts, bills]);

  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
