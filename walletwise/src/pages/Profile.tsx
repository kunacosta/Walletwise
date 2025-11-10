import React from 'react';
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';
import { PageHeader } from '../components/PageHeader';

export const Profile: React.FC = () => {
  const { user } = useAuthStore();
  return (
    <IonPage>
      <PageHeader title="Profile" />
      <IonContent className="ion-padding">
        {user ? (
          <IonList inset>
            <IonItem>
              <IonLabel>Email</IonLabel>
              <IonText>{user.email ?? '—'}</IonText>
            </IonItem>
            <IonItem>
              <IonLabel>UID</IonLabel>
              <IonText>{user.uid}</IonText>
            </IonItem>
          </IonList>
        ) : (
          <IonText color="medium"><p>No user</p></IonText>
        )}
      </IonContent>
    </IonPage>
  );
};
