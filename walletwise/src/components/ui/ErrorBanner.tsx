import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';

export const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <IonCard>
    <IonCardContent style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IonIcon icon={alertCircleOutline} color="danger" style={{ fontSize: 22 }} />
      <IonText color="danger">{message}</IonText>
    </IonCardContent>
  </IonCard>
);

