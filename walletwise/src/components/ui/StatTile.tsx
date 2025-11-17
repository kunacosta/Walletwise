import React from 'react';
import { IonIcon } from '@ionic/react';

type Tone = 'success' | 'warning' | 'danger' | 'default';

interface StatTileProps {
  icon: any;
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}

export const StatTile: React.FC<StatTileProps> = ({ icon, label, value, tone = 'default' }) => (
  <article className="stat-bento" data-tone={tone}>
    <div className="stat-bento__icon">
      <IonIcon icon={icon} />
    </div>
    <div className="stat-bento__content">
      <div className="stat-bento__label">{label}</div>
      <div className="stat-bento__value">{value}</div>
    </div>
  </article>
);
