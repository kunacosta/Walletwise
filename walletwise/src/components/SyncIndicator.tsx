import React from 'react';
import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircleOutline, cloudOfflineOutline, cloudUploadOutline } from 'ionicons/icons';
import { useSyncStatus } from '../state/useSyncStatus';

export const SyncIndicator: React.FC = () => {
  const online = useSyncStatus((s) => s.online);
  const connected = useSyncStatus((s) => s.connected);
  const pending = useSyncStatus((s) => s.pendingWrites);

  // Hide when fully synced and online
  if (online && connected && !pending) {
    return null;
  }

  let color: 'success' | 'warning' | 'medium' = 'success';
  let icon = checkmarkCircleOutline;
  let text = 'All changes saved';

  if (!online || !connected) {
    color = 'medium';
    icon = cloudOfflineOutline;
    text = 'Offline - will sync';
  } else if (pending) {
    color = 'warning';
    icon = cloudUploadOutline;
    text = 'Syncing...';
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 'auto',
        transform: 'none',
        bottom: 'calc(var(--ion-safe-area-bottom, 0px) + 74px)',
        zIndex: 1000,
        pointerEvents: 'none',
        maxWidth: '86vw',
      }}
      aria-live="polite"
      aria-atomic={true}
    >
      <IonChip color={color} style={{ pointerEvents: 'auto' }}>
        <IonIcon icon={icon} />
        <IonLabel>{text}</IonLabel>
      </IonChip>
    </div>
  );
};
