import React from 'react';
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
  const badgeClasses = ['account-card__badge'];
  if (safeTone === 'success') badgeClasses.push('is-positive');
  if (safeTone === 'danger') badgeClasses.push('is-negative');
  if (status === 'warning') badgeClasses.push('is-warning');

  return (
    <article className="account-card" role="group" aria-label={`${name} account`}>
      <div className="account-card__row" style={{ alignItems: 'center' }}>
        <div>
          <h3>{name}</h3>
          <div className="account-card__meta">
            <span>{type}</span>
            <span>Obligations&nbsp;<Money value={obligations} /></span>
          </div>
        </div>
        <span className={badgeClasses.join(' ')}>{safeToSpend >= 0 ? 'Healthy' : 'Attention'}</span>
      </div>

      <div className="account-card__row">
        <div>
          <div className="account-card__label">Safe to spend</div>
          <div className="account-card__value">
            <Money value={Math.abs(safeToSpend)} signed type={safeToSpend >= 0 ? 'income' : 'expense'} />
          </div>
        </div>
      </div>

      <div className="account-card__row">
        <span className="account-card__label">Balance</span>
        <Money value={balance} />
      </div>

      {status !== 'default' ? (
        <div className="account-card__row">
          <span className="account-card__label">Status</span>
          <span className="account-card__badge is-warning">{status}</span>
        </div>
      ) : null}
    </article>
  );
};
