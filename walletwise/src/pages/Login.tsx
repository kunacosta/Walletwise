import React, { useEffect, useState, type FormEvent } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  type InputCustomEvent,
  type InputChangeEventDetail,
} from '@ionic/react';
import { PageHeader } from '../components/PageHeader';
import { useHistory } from 'react-router-dom';
import { login } from '../services/auth';
import { useAuthStore } from '../state/useAuthStore';

export const Login: React.FC = () => {
  const history = useHistory();
  const { user, loading } = useAuthStore();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      history.replace('/');
    }
  }, [history, loading, user]);

  const handleEmailChange = (event: InputCustomEvent<InputChangeEventDetail>) => {
    setEmail(event.detail.value ?? '');
  };

  const handlePasswordChange = (event: InputCustomEvent<InputChangeEventDetail>) => {
    setPassword(event.detail.value ?? '');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      history.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <PageHeader title="Walletwise Login" />
      <IonContent className="ion-padding centered-page">
        <form onSubmit={handleSubmit}>
          <IonList inset className="container-narrow">
            <IonItem>
              <IonInput
                label="Email"
                labelPlacement="stacked"
                type="email"
                value={email}
                required
                onIonInput={handleEmailChange}
                autocomplete="email"
              />
            </IonItem>
            <IonItem>
              <IonInput
                label="Password"
                labelPlacement="stacked"
                type="password"
                value={password}
                required
                onIonInput={handlePasswordChange}
                autocomplete="current-password"
              />
            </IonItem>
          </IonList>
          {error ? (
            <IonText color="danger" role="alert">
              <p>{error}</p>
            </IonText>
          ) : null}
          <IonButton
            type="submit"
            expand="block"
            className="ion-margin-top container-narrow"
            disabled={submitting}
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </IonButton>
        </form>
        <IonButton routerLink="/register" fill="clear" expand="block" className="ion-margin-top container-narrow">
          Create an account
        </IonButton>
      </IonContent>
    </IonPage>
  );
};
