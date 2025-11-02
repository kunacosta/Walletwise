import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logout } from '../services/auth';
import { useAuthStore } from '../state/useAuthStore';

export const Settings: React.FC = () => {
  const history = useHistory();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {user?.email ? (
          <IonText>
            <p>Signed in as {user.email}</p>
          </IonText>
        ) : null}
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
          className="ion-margin-top"
        >
          {submitting ? 'Signing Out...' : 'Sign Out'}
        </IonButton>
      </IonContent>
    </IonPage>
  );
};
