import React from 'react';
import { IonIcon } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import { useSyncStatus } from '../state/useSyncStatus';

export const OfflineBadge: React.FC = () => {
  const online = useSyncStatus((s) => s.online);
  const connected = useSyncStatus((s) => s.connected);

  if (online && connected) return null;

  return (
    <IonIcon
      icon={cloudOfflineOutline}
      color="medium"
      aria-label="Offline"
      title="Offline"
      style={{ fontSize: 20, marginInlineEnd: 10 }}
    />
  );
};
