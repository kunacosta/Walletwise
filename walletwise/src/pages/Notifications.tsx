import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
} from '@ionic/react';
import { LocalNotifications, type PendingLocalNotificationSchema } from '@capacitor/local-notifications';

export const Notifications: React.FC = () => {
  const [pending, setPending] = useState<PendingLocalNotificationSchema[]>([]);

  const refresh = async () => {
    const res = await LocalNotifications.getPending();
    setPending(res.notifications);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const clearAll = async () => {
    if (pending.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
      await refresh();
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notifications Center</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonButton onClick={refresh}>Refresh</IonButton>
        <IonButton onClick={clearAll} color="danger" fill="outline" className="ion-margin-start">Clear All</IonButton>
        <IonList inset className="ion-margin-top">
          {pending.length === 0 ? (
            <IonItem>
              <IonLabel>No scheduled notifications</IonLabel>
            </IonItem>
          ) : (
            pending.map((n) => (
              <IonItem key={n.id}>
                <IonLabel>
                  <h3>{n.title ?? 'Untitled'}</h3>
                  <p>{n.body ?? ''}</p>
                  <p>At: {String((n.schedule as any)?.at ?? '')}</p>
                </IonLabel>
              </IonItem>
            ))
          )}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

