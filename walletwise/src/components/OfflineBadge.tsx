import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { alertCircleOutline, cloudOfflineOutline, cloudUploadOutline } from 'ionicons/icons';
import { useSyncStatus } from '../state/useSyncStatus';

type OfflineBadgeProps = {
  /**
   * Optional override for retry logic (e.g., force refetch commands).
   */
  onRetry?: () => Promise<void> | void;
};

type StatusConfig =
  | {
      hidden: true;
    }
  | {
      tone: 'info' | 'warning' | 'danger';
      icon: string;
      title: string;
      body: string;
      meta?: string;
      showRetry?: boolean;
      actionLabel?: string;
      urgent?: boolean;
      loading?: boolean;
      showSkeleton?: boolean;
      dataState: 'offline' | 'connecting' | 'pending' | 'error';
    };

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ onRetry }) => {
  const online = useSyncStatus((state) => state.online);
  const connected = useSyncStatus((state) => state.connected);
  const pendingWrites = useSyncStatus((state) => state.pendingWrites);
  const lastError = useSyncStatus((state) => state.lastError);
  const lastSyncedAt = useSyncStatus((state) => state.lastSyncedAt);

  const [isRetrying, setRetrying] = React.useState(false);
  const titleId = React.useId();
  const descriptionId = React.useId();

  const relativeSynced = React.useMemo(() => formatRelativeTime(lastSyncedAt), [lastSyncedAt]);

  const status = React.useMemo<StatusConfig>(() => {
    if (lastError) {
      return {
        tone: 'danger',
        icon: alertCircleOutline,
        title: 'Sync issue detected',
        body: lastError,
        meta: relativeSynced,
        showRetry: true,
        urgent: true,
        dataState: 'error',
      };
    }

    if (!online) {
      return {
        tone: 'danger',
        icon: cloudOfflineOutline,
        title: 'You are offline',
        body: 'Recent data remains available. Changes will sync automatically when you reconnect.',
        meta: relativeSynced,
        showRetry: true,
        urgent: true,
        dataState: 'offline',
      };
    }

    if (online && !connected) {
      // Hide the reconnecting pill entirely
      return { hidden: true };
    }

    if (pendingWrites) {
      return {
        tone: 'info',
        icon: cloudUploadOutline,
        title: 'Syncing your edits',
        body: 'Your most recent updates are encrypting and heading to the cloud.',
        meta: relativeSynced,
        dataState: 'pending',
      };
    }

    return { hidden: true };
  }, [connected, lastError, online, pendingWrites, relativeSynced]);

  const handleRetry = React.useCallback(async () => {
    if (isRetrying) return;
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }, [isRetrying, onRetry]);

  if ('hidden' in status) {
    return null;
  }

  return (
    <IonCard
      className={`connection-pill connection-pill--${status.tone}`}
      data-state={status.dataState}
      role="status"
      aria-live={status.urgent ? 'assertive' : 'polite'}
      aria-busy={status.loading ? 'true' : 'false'}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <IonCardContent className="connection-pill__layout">
        <span className="connection-pill__icon" aria-hidden="true">
          <IonIcon icon={status.icon} />
        </span>

        <div className="connection-pill__content">
          <p id={titleId} className="connection-pill__title">
            {status.title}
          </p>
          <p id={descriptionId} className="connection-pill__body">
            {status.body}
          </p>
          {status.meta && <p className="connection-pill__meta">{status.meta}</p>}

          {status.showSkeleton && (
            <div className="connection-pill__skeletons" aria-hidden="true">
              <span className="connection-pill__skeleton connection-pill__skeleton--wide" />
              <span className="connection-pill__skeleton connection-pill__skeleton--narrow" />
            </div>
          )}
        </div>

        {status.showRetry && (
          <IonButton
            fill="solid"
            color="primary"
            className="connection-pill__action"
            onClick={handleRetry}
            disabled={isRetrying}
            expand="block"
            size="small"
          >
            {isRetrying ? 'Reconnecting...' : status.actionLabel ?? 'Retry now'}
          </IonButton>
        )}
      </IonCardContent>
    </IonCard>
  );
};

const formatRelativeTime = (date: Date | null): string => {
  if (!date) {
    return 'Awaiting first sync';
  }

  const diff = Date.now() - date.getTime();
  const table: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { limit: 60_000, divisor: 1_000, unit: 'second' },
    { limit: 3_600_000, divisor: 60_000, unit: 'minute' },
    { limit: 86_400_000, divisor: 3_600_000, unit: 'hour' },
    { limit: 604_800_000, divisor: 86_400_000, unit: 'day' },
  ];

  for (const row of table) {
    if (diff < row.limit) {
      const value = Math.max(1, Math.round(diff / row.divisor));
      if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
        const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
        return formatter.format(-value, row.unit);
      }
      const unitLabel = `${row.unit}${value > 1 ? 's' : ''}`;
      return `${value} ${unitLabel} ago`;
    }
  }

  const days = Math.max(1, Math.round(diff / 86_400_000));
  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    return formatter.format(-days, 'day');
  }
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};
