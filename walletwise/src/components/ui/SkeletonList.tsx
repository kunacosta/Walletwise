import React from 'react';
import { IonCard, IonCardContent, IonSkeletonText } from '@ionic/react';

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <IonCard key={i} style={{ marginBottom: 8 }}>
          <IonCardContent>
            <IonSkeletonText animated={true} style={{ width: '40%', height: 16 }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <IonSkeletonText animated={true} style={{ width: '25%', height: 24 }} />
              <IonSkeletonText animated={true} style={{ width: '15%', height: 20 }} />
              <IonSkeletonText animated={true} style={{ width: '35%', height: 20 }} />
            </div>
          </IonCardContent>
        </IonCard>
      ))}
    </>
  );
};

