import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { useAuthStore } from '../state/useAuthStore';

export const Profile: React.FC = () => {
  const { user } = useAuthStore();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
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

