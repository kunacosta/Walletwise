import React from 'react';
import { IonHeader, IonToolbar, IonTitle, IonButtons } from '@ionic/react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  start?: React.ReactNode;
  end?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, start, end }) => (
  <IonHeader>
    <IonToolbar>
      {start ? <IonButtons slot="start">{start}</IonButtons> : null}
      <IonTitle>
        {title}
        {subtitle ? (
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ion-color-medium)' }}>{subtitle}</div>
        ) : null}
      </IonTitle>
      {end ? <IonButtons slot="end">{end}</IonButtons> : null}
    </IonToolbar>
  </IonHeader>
);

