import React from 'react';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { PrivateRoute } from '../components/PrivateRoute';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Ledger } from '../pages/Ledger';
import { Settings } from '../pages/Settings';
import { Analytics } from '../pages/Analytics';
import { useAuthStore } from '../state/useAuthStore';

const FallbackRedirect: React.FC = () => {
  const { user } = useAuthStore();
  return <Redirect to={user ? '/' : '/login'} />;
};

export const AppRouter: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/login" component={Login} />
        <Route exact path="/register" component={Register} />
        <Route
          exact
          path="/"
          render={() => (
            <PrivateRoute>
              <Ledger />
            </PrivateRoute>
          )}
        />
        <Route
          exact
          path="/settings"
          render={() => (
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          )}
        />
        <Route
          exact
          path="/analytics"
          render={() => (
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          )}
        />
        <Route render={() => <FallbackRedirect />} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);
