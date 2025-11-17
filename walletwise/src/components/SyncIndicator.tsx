import React from 'react';
import { IonIcon } from '@ionic/react';
import { checkmarkCircleOutline, cloudOfflineOutline, cloudUploadOutline } from 'ionicons/icons';
import { useSyncStatus } from '../state/useSyncStatus';

export const SyncIndicator: React.FC = () => {
  const online = useSyncStatus((s) => s.online);
  const connected = useSyncStatus((s) => s.connected);
  const pending = useSyncStatus((s) => s.pendingWrites);

  let color: 'success' | 'warning' | 'medium' = 'success';
  let icon = checkmarkCircleOutline;
  let ariaLabel = 'Online and synced';

  if (!online || !connected) {
    color = 'medium';
    icon = cloudOfflineOutline;
    ariaLabel = 'Offline – changes will sync when reconnected';
  } else if (pending) {
    color = 'warning';
    icon = cloudUploadOutline;
    ariaLabel = 'Syncing recent changes';
  }

  return (
    <IonIcon
      icon={icon}
      color={color}
      aria-label={ariaLabel}
      style={{ fontSize: 20 }}
    />
  );
};
