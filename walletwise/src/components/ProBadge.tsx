import React from 'react';
import { IonBadge, IonButton } from '@ionic/react';
import { useSettings } from '../state/settings';
import styles from './ProBadge.module.css';

export const ProBadge: React.FC = () => {
  const isPro = useSettings((s) => s.isPro);
  if (!isPro) return null;
  return (
    <IonButton
      className={styles.button}
      fill="clear"
      size="small"
      disabled
      aria-label="Pro plan active"
    >
      <IonBadge color="warning">PRO</IonBadge>
    </IonButton>
  );
};

