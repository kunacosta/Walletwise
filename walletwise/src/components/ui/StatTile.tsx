import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';

type Tone = 'success' | 'warning' | 'danger' | 'default';

interface StatTileProps {
  icon: any;
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}

export const StatTile: React.FC<StatTileProps> = ({ icon, label, value, tone = 'default' }) => {
  const color = tone === 'default' ? 'medium' : tone;
  return (
    <IonCard>
      <IonCardContent style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IonIcon icon={icon} color={color as any} style={{ fontSize: 24 }} />
        <div>
          <IonText color="medium"><small>{label}</small></IonText>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

