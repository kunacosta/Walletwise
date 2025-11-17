import React from 'react';
import { IonHeader, IonToolbar, IonTitle, IonMenuButton, IonButtons } from '@ionic/react';
import { SyncIndicator } from './SyncIndicator';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  start?: React.ReactNode;
  end?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, description, start, end }) => (
  <IonHeader translucent>
    <IonToolbar className="app-toolbar" mode="md">
      <IonButtons slot="start">
        <IonMenuButton />
        {start ? (
          <div className="toolbar-slot toolbar-slot--start">
            {start}
          </div>
        ) : null}
      </IonButtons>
      <IonTitle>
        <div className="h1">{title}</div>
        {subtitle ? <div className="app-toolbar__subtitle">{subtitle}</div> : null}
        {description ? <div className="app-toolbar__subtitle">{description}</div> : null}
      </IonTitle>
      <div slot="end" className="toolbar-slot toolbar-slot--end">
        {end}
        <SyncIndicator />
      </div>
    </IonToolbar>
  </IonHeader>
);
