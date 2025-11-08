import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';
import { cubeOutline } from 'ionicons/icons';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  message = 'Add your first item to get started.',
}) => (
  <IonCard>
    <IonCardContent style={{ textAlign: 'center' }}>
      <IonIcon icon={cubeOutline} color="medium" style={{ fontSize: 36 }} />
      <div style={{ marginTop: 8 }}>
        <IonText><h3 style={{ margin: 0 }}>{title}</h3></IonText>
        <IonText color="medium"><p style={{ margin: 0 }}>{message}</p></IonText>
      </div>
    </IonCardContent>
  </IonCard>
);

