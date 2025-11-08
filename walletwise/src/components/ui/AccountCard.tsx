import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge, IonText } from '@ionic/react';
import { Money } from './Money';

type Status = 'default' | 'success' | 'warning' | 'danger';

interface AccountCardProps {
  name: string;
  type: string;
  safeToSpend: number;
  balance: number;
  obligations: number;
  status?: Status;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  name,
  type,
  safeToSpend,
  balance,
  obligations,
  status = 'default',
}) => {
  const safeTone: Status = safeToSpend >= 0 ? 'success' : 'danger';

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{name}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <div>
            <IonText color="medium"><p style={{ margin: 0 }}>Safe to spend</p></IonText>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              <Money value={Math.abs(safeToSpend)} signed type={safeToSpend >= 0 ? 'income' : 'expense'} />
            </div>
          </div>
          <IonBadge color={safeTone as any}>{safeToSpend >= 0 ? 'Positive' : 'Over'}</IonBadge>
          <IonBadge color="warning">Obligations {<Money value={obligations} />}</IonBadge>
        </div>
        <IonText color="medium"><p style={{ marginTop: 8, marginBottom: 0 }}>Balance: <Money value={balance} /></p></IonText>
        <IonText color="medium"><p style={{ marginTop: 4, marginBottom: 0 }}>Type: {type}</p></IonText>
        {status !== 'default' ? (
          <div style={{ marginTop: 8 }}>
            <IonBadge color={status as any}>{status.toUpperCase()}</IonBadge>
          </div>
        ) : null}
      </IonCardContent>
    </IonCard>
  );
};

