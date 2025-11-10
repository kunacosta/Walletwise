import React from 'react';
import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircleOutline, cloudOfflineOutline, cloudUploadOutline } from 'ionicons/icons';
import { useSyncStatus } from '../state/useSyncStatus';

export const SyncIndicator: React.FC = () => {
  const online = useSyncStatus((s) => s.online);
  const connected = useSyncStatus((s) => s.connected);
  const pending = useSyncStatus((s) => s.pendingWrites);

  let color: 'success' | 'warning' | 'medium' = 'success';
  let icon = checkmarkCircleOutline;
  let text = 'All changes saved';

  if (!online || !connected) {
    color = 'medium';
    icon = cloudOfflineOutline;
    text = 'Offline — changes will sync';
  } else if (pending) {
    color = 'warning';
    icon = cloudUploadOutline;
    text = 'Saving…';
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 72,
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <IonChip color={color} style={{ pointerEvents: 'auto' }}>
        <IonIcon icon={icon} />
        <IonLabel>{text}</IonLabel>
      </IonChip>
    </div>
  );
};
