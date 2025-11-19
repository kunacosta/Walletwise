import React, { useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonBadge,
  IonText,
  IonIcon,
} from '@ionic/react';
import { mapOutline, pinOutline } from 'ionicons/icons';
import { useTxnStore } from '../state/useTxnStore';
import { formatCurrency } from '../utils/format';
import { ProBadge } from '../components/ProBadge';
import { PageHeader } from '../components/PageHeader';

interface LocationGroup {
  key: string;
  lat: number;
  lng: number;
  count: number;
  total: number;
}

export const SpendingMap: React.FC = () => {
  const items = useTxnStore((s) => s.items);

  const itemsWithLocation = useMemo(
    () => items.filter((t) => t.type === 'expense' && t.locationLat !== undefined && t.locationLng !== undefined),
    [items],
  );

  const groups = useMemo<LocationGroup[]>(() => {
    const map = new Map<string, LocationGroup>();

    for (const txn of itemsWithLocation) {
      const lat = txn.locationLat as number;
      const lng = txn.locationLng as number;
      const latKey = lat.toFixed(3);
      const lngKey = lng.toFixed(3);
      const key = `${latKey}, ${lngKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.total += txn.amount;
      } else {
        map.set(key, {
          key,
          lat,
          lng,
          count: 1,
          total: txn.amount,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [itemsWithLocation]);

  const total = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <IonPage>
      <PageHeader title="Spending Map" subtitle="Where your money actually goes" start={<ProBadge />} />
      <IonContent className="app-content">
        <section className="header-gradient">
          <div className="h1">Location-aware spending</div>
          <p className="body">
            Transactions with saved GPS coordinates are grouped into real-world spots.
          </p>
        </section>

        <div className="section-stack">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={mapOutline} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Spending locations
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {groups.length === 0 ? (
                <IonText color="medium">
                  <p>
                    No transactions have location yet. When adding a transaction, tap
                    &nbsp;<strong>Use current location</strong> to start building this view.
                  </p>
                </IonText>
              ) : (
                <>
                  <div className="stats-row" style={{ marginBottom: 12 }}>
                    <IonChip color="primary">
                      {groups.length} spot{groups.length === 1 ? '' : 's'}
                    </IonChip>
                    <IonChip color="danger">
                      Total spend {formatCurrency(total)}
                    </IonChip>
                  </div>
                  <IonList inset>
                    {groups.map((g) => (
                      <IonItem
                        key={g.key}
                        button
                        detail
                        href={`https://www.google.com/maps?q=${g.lat},${g.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <IonLabel>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IonIcon icon={pinOutline} />
                            <h3>{g.key}</h3>
                          </div>
                          <p>
                            {g.count} expense{g.count === 1 ? '' : 's'} recorded here
                          </p>
                        </IonLabel>
                        <IonBadge slot="end" color="dark">
                          {formatCurrency(g.total)}
                        </IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

