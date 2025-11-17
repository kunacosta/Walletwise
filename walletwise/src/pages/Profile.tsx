import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButton,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore';
import { PageHeader } from '../components/PageHeader';
import { logout } from '../services/auth';

export const Profile: React.FC = () => {
  const { user } = useAuthStore();
  const history = useHistory();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) {
    return (
      <IonPage>
        <PageHeader title="Profile" />
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p>You’re not signed in.</p>
          </IonText>
          <IonButton expand="block" onClick={() => history.replace('/login')}>
            Go to Login
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const displayName =
    user.displayName || (user.email ? user.email.split('@')[0] : 'WalletWise user');
  const email = user.email ?? 'No email';

  let memberSince: string | null = null;
  const createdAt = user.metadata?.creationTime;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      memberSince = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    }
  }

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'WW';

  const handleManageSettings = () => {
    history.push('/settings');
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      history.replace('/login');
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <IonPage>
      <PageHeader title="Profile" />
      <IonContent className="ion-padding">
        <section className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-email">{email}</div>
            {memberSince ? (
              <div className="profile-meta">Member since {memberSince}</div>
            ) : null}
          </div>
        </section>

        <IonList inset>
          <IonItem button detail onClick={handleManageSettings}>
            <IonLabel>Account & settings</IonLabel>
          </IonItem>
        </IonList>

        <div className="profile-actions">
          <IonButton expand="block" fill="outline" color="medium" onClick={handleManageSettings}>
            Edit profile
          </IonButton>
          <IonButton
            expand="block"
            color="danger"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}

