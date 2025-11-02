import React, { type ReactElement } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Redirect, useLocation } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore';

interface PrivateRouteProps {
  children: ReactElement;
  redirectPath?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  redirectPath = '/login',
}) => {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  console.log('Auth state', {
    user: user ? { uid: user.uid, email: user.email } : null,
    loading,
  });

  if (loading) {
    console.log('Auth guard still loading');
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner name="crescent" />
          <p>Loading...</p>
        </IonContent>
      </IonPage>
    );
  }

  if (!user) {
    console.log('Auth guard redirect', { from: location.pathname });
    return <Redirect to={{ pathname: redirectPath, state: { from: location.pathname } }} />;
  }

  return children;
};
