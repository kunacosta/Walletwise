import React from 'react';
import {
  IonApp,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { PrivateRoute } from '../components/PrivateRoute';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Ledger } from '../pages/Ledger';
import { Settings } from '../pages/Settings';
import { Analytics } from '../pages/Analytics';
import { Accounts } from '../pages/Accounts';
import { Dashboard } from '../pages/Dashboard';
import { Calendar } from '../pages/Calendar';
import { Notifications } from '../pages/Notifications';
import { Profile } from '../pages/Profile';
import { AddTransaction } from '../pages/AddTransaction';
import { useAuthStore } from '../state/useAuthStore';
import {
  homeOutline,
  listOutline,
  cardOutline,
  calendarOutline,
  pieChartOutline,
  settingsOutline,
} from 'ionicons/icons';

const FallbackRedirect: React.FC = () => {
  const { user } = useAuthStore();
  return <Redirect to={user ? '/' : '/login'} />;
};

export const AppRouter: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <IonApp>
      <IonReactRouter>
        {user ? (
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/" render={() => (
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              )} />
              <Route exact path="/dashboard" render={() => (
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              )} />
              <Route exact path="/ledger" render={() => (
                <PrivateRoute>
                  <Ledger />
                </PrivateRoute>
              )} />
              <Route exact path="/transactions/new" render={() => (
                <PrivateRoute>
                  <AddTransaction />
                </PrivateRoute>
              )} />
              <Route exact path="/accounts" render={() => (
                <PrivateRoute>
                  <Accounts />
                </PrivateRoute>
              )} />
              <Route exact path="/calendar" render={() => (
                <PrivateRoute>
                  <Calendar />
                </PrivateRoute>
              )} />
              <Route exact path="/analytics" render={() => (
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              )} />
              <Route exact path="/settings" render={() => (
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              )} />
              <Route exact path="/notifications" render={() => (
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              )} />
              <Route exact path="/profile" render={() => (
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              )} />
              <Route render={() => <FallbackRedirect />} />
            </IonRouterOutlet>
            <IonTabBar slot="bottom">
              <IonTabButton tab="dashboard" href="/dashboard">
                <IonIcon icon={homeOutline} />
                <IonLabel>Home</IonLabel>
              </IonTabButton>
              <IonTabButton tab="ledger" href="/ledger">
                <IonIcon icon={listOutline} />
                <IonLabel>Ledger</IonLabel>
              </IonTabButton>
              <IonTabButton tab="accounts" href="/accounts">
                <IonIcon icon={cardOutline} />
                <IonLabel>Accounts</IonLabel>
              </IonTabButton>
              <IonTabButton tab="calendar" href="/calendar">
                <IonIcon icon={calendarOutline} />
                <IonLabel>Calendar</IonLabel>
              </IonTabButton>
              <IonTabButton tab="analytics" href="/analytics">
                <IonIcon icon={pieChartOutline} />
                <IonLabel>Analytics</IonLabel>
              </IonTabButton>
              <IonTabButton tab="settings" href="/settings">
                <IonIcon icon={settingsOutline} />
                <IonLabel>Settings</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        ) : (
          <IonRouterOutlet>
            <Route exact path="/login" component={Login} />
            <Route exact path="/register" component={Register} />
            <Route render={() => <FallbackRedirect />} />
          </IonRouterOutlet>
        )}
      </IonReactRouter>
    </IonApp>
  );
};
