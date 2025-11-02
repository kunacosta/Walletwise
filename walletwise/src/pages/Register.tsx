import React, { useEffect, useState, type FormEvent } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  type InputCustomEvent,
  type InputChangeEventDetail,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { register as registerUser } from '../services/auth';
import { useAuthStore } from '../state/useAuthStore';

export const Register: React.FC = () => {
  const history = useHistory();
  const { user, loading } = useAuthStore();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
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

  const handleConfirmPasswordChange = (
    event: InputCustomEvent<InputChangeEventDetail>,
  ) => {
    setConfirmPassword(event.detail.value ?? '');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await registerUser(email, password);
      history.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonList inset>
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
                autocomplete="new-password"
              />
            </IonItem>
            <IonItem>
              <IonInput
                label="Confirm Password"
                labelPlacement="stacked"
                type="password"
                value={confirmPassword}
                required
                onIonInput={handleConfirmPasswordChange}
                autocomplete="new-password"
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
            className="ion-margin-top"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </IonButton>
        </form>
        <IonButton routerLink="/login" fill="clear" expand="block" className="ion-margin-top">
          Back to login
        </IonButton>
      </IonContent>
    </IonPage>
  );
};
