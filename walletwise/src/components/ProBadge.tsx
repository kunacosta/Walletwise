import React from 'react';
import { IonBadge } from '@ionic/react';
import { useSettings } from '../state/settings';

export const ProBadge: React.FC = () => {
  const isPro = useSettings((s) => s.isPro);
  if (!isPro) return null;
  return <IonBadge color="warning">PRO</IonBadge>;
};

