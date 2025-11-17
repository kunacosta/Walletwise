import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonText,
  IonItem,
  IonLabel,
  IonToggle,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logout } from '../services/auth';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useSettings } from '../state/settings';
import { useTxnStore } from '../state/useTxnStore';
import { ProBadge } from '../components/ProBadge';
import { useAuthStore } from '../state/useAuthStore';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ensurePermission } from '../features/notifications/scheduler';
import { PageHeader } from '../components/PageHeader';

export const Settings: React.FC = () => {
  const history = useHistory();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettings((s) => s.setNotificationsEnabled);
  const [, setPermission] = useState<string>('unknown');

  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const currency = useSettings((s) => s.currency);
  const setCurrency = useSettings((s) => s.setCurrency);
  const firstDayOfWeek = useSettings((s) => s.firstDayOfWeek);
  const setFirstDayOfWeek = useSettings((s) => s.setFirstDayOfWeek);

  const spendWindowDays = useSettings((s) => s.spendWindowDays);
  const setSpendWindowDays = useSettings((s) => s.setSpendWindowDays);
  const bufferMode = useSettings((s) => s.bufferMode);
  const setBufferMode = useSettings((s) => s.setBufferMode);
  const bufferValue = useSettings((s) => s.bufferValue);
  const setBufferValue = useSettings((s) => s.setBufferValue);
  const bufferPercent = useSettings((s) => s.bufferPercent);
  const setBufferPercent = useSettings((s) => s.setBufferPercent);
  const includeCredit = useSettings((s) => s.includeCreditInSpendable);
  const setIncludeCredit = useSettings((s) => s.setIncludeCreditInSpendable);
  const [showSpendableAdvanced, setShowSpendableAdvanced] = useState(false);

  useEffect(() => {
    // best-effort check
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.checkPermissions().then((s) => setPermission(String(s.display)));
    }).catch(() => setPermission('unknown'));
  }, []);

  const handleLogout = async () => {
    setError(null);
    setSubmitting(true);

    try {
      await logout();
      history.replace('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign out.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <PageHeader title="Settings" start={<ProBadge />} />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Account controls</div>
          <p className="body">{user?.email ? `Signed in as ${user.email}` : 'Manage preferences'}</p>
        </section>

        <div className="section-stack">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Profile</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <ProfileSection />
            </IonCardContent>
          </IonCard>

          <IonCard>
              <IonCardHeader>
                <IonCardTitle>Notifications</IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="stack-gap">
                <IonItem lines="full">
                  <IonLabel>Enable Notifications</IonLabel>
                  <IonToggle
                    checked={notificationsEnabled}
                    onIonChange={async (e) => {
                      const enabled = Boolean(e.detail.checked);
                      setNotificationsEnabled(enabled);
                      if (enabled) {
                        const ok = await ensurePermission();
                        setPermission(ok ? 'granted' : 'denied');
                      }
                    }}
                  />
                </IonItem>
                <IonButton routerLink="/notifications" fill="outline" expand="block">
                  Notifications Center
                </IonButton>
              </IonCardContent>
            </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Appearance & Defaults</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel>Theme</IonLabel>
                <IonSelect value={theme} onIonChange={(e) => setTheme((e.detail.value as any) ?? 'system')} interface="popover">
                  <IonSelectOption value="system">System</IonSelectOption>
                  <IonSelectOption value="light">Light</IonSelectOption>
                  <IonSelectOption value="dark">Dark</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>Currency</IonLabel>
                <IonSelect value={currency} onIonChange={(e) => setCurrency((e.detail.value as string) || 'USD')} interface="popover">
                  <IonSelectOption value="USD">USD</IonSelectOption>
                  <IonSelectOption value="MYR">MYR</IonSelectOption>
                  <IonSelectOption value="EUR">EUR</IonSelectOption>
                  <IonSelectOption value="GBP">GBP</IonSelectOption>
                  <IonSelectOption value="INR">INR</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>First day of week</IonLabel>
                <IonSelect value={firstDayOfWeek} onIonChange={(e) => setFirstDayOfWeek(((e.detail.value as number) ?? 0) as 0 | 1)} interface="popover">
                  <IonSelectOption value={0}>Sunday</IonSelectOption>
                  <IonSelectOption value={1}>Monday</IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Spendable</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel>Window</IonLabel>
                <IonSelect value={spendWindowDays} onIonChange={(e) => setSpendWindowDays(Number(e.detail.value ?? 14))} interface="popover">
                  <IonSelectOption value={7}>7 days</IonSelectOption>
                  <IonSelectOption value={14}>14 days</IonSelectOption>
                  <IonSelectOption value={30}>30 days</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>Include credit accounts</IonLabel>
                <IonToggle checked={includeCredit} onIonChange={(e) => setIncludeCredit(Boolean(e.detail.checked))} />
              </IonItem>
              <IonButton
                fill="outline"
                color="medium"
                expand="block"
                className="ion-margin-top"
                onClick={() => setShowSpendableAdvanced((prev) => !prev)}
              >
                {showSpendableAdvanced ? 'Hide advanced spendable controls' : 'Show advanced spendable controls'}
              </IonButton>
              {showSpendableAdvanced && (
                <>
                  <IonItem className="ion-margin-top">
                    <IonLabel>Buffer Mode</IonLabel>
                    <IonSelect value={bufferMode} onIonChange={(e) => setBufferMode((e.detail.value as any) ?? 'fixed')} interface="popover">
                      <IonSelectOption value="fixed">Fixed</IonSelectOption>
                      <IonSelectOption value="percent">Percent</IonSelectOption>
                      <IonSelectOption value="none">None</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  {bufferMode === 'fixed' ? (
                    <IonItem>
                      <IonLabel position="stacked">Buffer Amount</IonLabel>
                      <IonInput type="number" inputMode="decimal" value={String(bufferValue)} onIonInput={(e) => setBufferValue(Number(e.detail.value ?? bufferValue))} />
                    </IonItem>
                  ) : null}
                  {bufferMode === 'percent' ? (
                    <IonItem>
                      <IonLabel position="stacked">Buffer Percent</IonLabel>
                      <IonInput type="number" inputMode="decimal" value={String(bufferPercent)} onIonInput={(e) => setBufferPercent(Number(e.detail.value ?? bufferPercent))} />
                    </IonItem>
                  ) : null}
                </>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Pro</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <ProSection />
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Data & Sign out</IonCardTitle>
            </IonCardHeader>
            <IonCardContent className="stack-gap">
              <DataSection />
              {error ? (
                <IonText color="danger" role="alert">
                  <p>{error}</p>
                </IonText>
              ) : null}
              <IonButton
                expand="block"
                color="danger"
                onClick={handleLogout}
                disabled={submitting}
              >
                {submitting ? 'Signing Out...' : 'Sign Out'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

const ProSection: React.FC = () => {
  const isPro = useSettings((s) => s.isPro);
  const proExpiresAt = useSettings((s) => s.proExpiresAt);
  const setPro = useSettings((s) => s.setPro);

  const upgrade = async () => {
    const exp = new Date();
    exp.setDate(exp.getDate() + 365); // simulate 1-year Pro
    await setPro(true, exp);
  };

  const downgrade = async () => {
    await setPro(false, null);
  };

  return (
    <>
      <IonText>
        <p>Status: {isPro ? 'Pro active' : 'Free'}</p>
        {isPro && proExpiresAt ? (
          <p>Expires: {proExpiresAt.toDateString()}</p>
        ) : null}
        {!isPro && (
          <p>This is a prototype Pro toggle for this app demo; no real billing is connected.</p>
        )}
      </IonText>
      {isPro ? (
        <IonButton color="medium" onClick={downgrade} expand="block">Downgrade to Free</IonButton>
      ) : (
        <IonButton color="warning" onClick={upgrade} expand="block">Upgrade to Pro</IonButton>
      )}
      <div className="ion-margin-top">
        <IonText><p>Features</p></IonText>
        <ul>
          <li>Accounts — Free: up to 5; Pro: unlimited</li>
          <li>Analytics — Free: current month; Pro: full history</li>
          <li>Receipts — Free: no attachments; Pro: attachments</li>
          <li>CSV Export — Free: current month; Pro: any period</li>
        </ul>
      </div>
    </>
  );
};

const ProfileSection: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState<string>(user?.displayName ?? '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);

  const saveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName || null });
      setMessage('Profile updated');
      setUser(auth.currentUser);
      setEditingName(false);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!auth.currentUser || !newPassword) return;
    setSaving(true);
    setMessage(null);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setMessage('Password updated');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h3>Profile</h3>
      <IonItem>
        <IonLabel position="stacked">Email</IonLabel>
        <IonInput value={user?.email ?? ''} readonly />
      </IonItem>
      <IonItem>
        <IonLabel position="stacked">Display name (for greeting)</IonLabel>
        {editingName ? (
          <IonInput
            value={displayName}
            onIonInput={(e) => setDisplayName(e.detail.value ?? '')}
          />
        ) : (
          <IonText>
            <p>{displayName || 'Not set'}</p>
          </IonText>
        )}
      </IonItem>
      {editingName ? (
        <div className="ion-margin-top">
          <IonButton onClick={saveProfile} disabled={saving}>
            Save name
          </IonButton>
          <IonButton
            fill="outline"
            color="medium"
            onClick={() => {
              setDisplayName(user?.displayName ?? '');
              setEditingName(false);
            }}
            disabled={saving}
          >
            Cancel
          </IonButton>
        </div>
      ) : (
        <IonButton
          className="ion-margin-top"
          fill="outline"
          onClick={() => setEditingName(true)}
        >
          Edit display name
        </IonButton>
      )}
      <h4 className="ion-margin-top">Change Password</h4>
      <IonItem>
        <IonLabel position="stacked">New Password</IonLabel>
        <IonInput type="password" value={newPassword} onIonInput={(e) => setNewPassword(e.detail.value ?? '')} />
      </IonItem>
      <IonButton className="ion-margin-top" onClick={changePassword} disabled={saving || !newPassword}>Update Password</IonButton>
      {message ? (
        <IonText color="medium"><p>{message}</p></IonText>
      ) : null}
    </>
  );
};

const DataSection: React.FC = () => {
  const items = useTxnStore((s) => s.items);
  const isPro = useSettings((s) => s.isPro);
  const { user } = useAuthStore();
  const [busy, setBusy] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const exportCsv = async () => {
    const month = new Date();
    const txns = isPro ? items : items.filter((t) => t.date.getFullYear() === month.getFullYear() && t.date.getMonth() === month.getMonth());
    const header = ['id','type','amount','category','note','date'];
    const rows = txns.map((t) => [
      t.id,
      t.type,
      t.amount.toFixed(2),
      t.category ?? '',
      (t.note ?? '').replace(/\n/g, ' '),
      t.date.toISOString(),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walletwise-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearCache = async () => {
    setBusy(true);
    try {
      const { Storage } = await import('@ionic/storage');
      const storage = new Storage({ name: 'walletwise', storeName: 'app' });
      await storage.create();
      await storage.clear();
    } finally {
      setBusy(false);
    }
  };

  const resetDemoData = async () => {
    if (!user?.uid) return;
    setBusy(true);
    try {
      const db = getFirestore();
      const colls = ['transactions','accounts','bills','categories'];
      for (const c of colls) {
        const snaps = await getDocs(collection(db, 'users', user.uid, c));
        for (const d of snaps.docs) {
          await deleteDoc(doc(db, 'users', user.uid, c, d.id));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3 className="ion-margin-top">Data</h3>
      <IonButton onClick={exportCsv} expand="block">Export CSV ({isPro ? 'All' : 'Current month'})</IonButton>
      <IonButton
        onClick={() => setShowAdvanced((prev) => !prev)}
        expand="block"
        fill="outline"
        color="medium"
      >
        {showAdvanced ? 'Hide advanced data tools' : 'Show advanced data tools'}
      </IonButton>
      {showAdvanced && (
        <>
          <IonText color="medium">
            <p>These actions are advanced and can remove local or demo data. Use with care.</p>
          </IonText>
          <IonButton onClick={clearCache} expand="block" color="medium" disabled={busy}>
            Clear app cache (advanced)
          </IonButton>
          <IonButton onClick={resetDemoData} expand="block" color="danger" fill="outline" disabled={busy}>
            Reset demo data (advanced)
          </IonButton>
        </>
      )}
    </>
  );
};
