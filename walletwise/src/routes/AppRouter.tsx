import React from 'react';
import {
  IonApp,
  IonRouterOutlet,
  IonIcon,
  IonLabel,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonMenuToggle,
  IonHeader as IonMenuHeader,
  IonToolbar as IonMenuToolbar,
  IonTitle as IonMenuTitle,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { PrivateRoute } from '../components/PrivateRoute';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Transactions } from '../pages/Transactions';
import { Settings } from '../pages/Settings';
import { Analytics } from '../pages/Analytics';
import { Accounts } from '../pages/Accounts';
import { Bills } from '../pages/Bills';
import { Dashboard } from '../pages/Dashboard';
import { Calendar } from '../pages/Calendar';
import { Notifications } from '../pages/Notifications';
import { Profile } from '../pages/Profile';
import { AddTransaction } from '../pages/AddTransaction';
import { CategoryPicker } from '../pages/CategoryPicker';
import { useAuthStore } from '../state/useAuthStore';
import {
  homeOutline,
  listOutline,
  cardOutline,
  calendarOutline,
  pieChartOutline,
  settingsOutline,
  notificationsOutline,
  personCircleOutline,
  timeOutline,
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
          <>
            <IonMenu contentId="main-content" type="overlay" className="app-menu">
              <IonMenuHeader>
                <IonMenuToolbar>
                  <IonMenuTitle>WalletWise</IonMenuTitle>
                </IonMenuToolbar>
              </IonMenuHeader>
              <IonContent>
                <IonList>
                  <IonMenuToggle>
                    <IonItem routerLink="/dashboard" routerDirection="root">
                      <IonIcon icon={homeOutline} slot="start" />
                      <IonLabel>Dashboard</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/transactions" routerDirection="root">
                      <IonIcon icon={listOutline} slot="start" />
                      <IonLabel>Transactions</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/accounts" routerDirection="root">
                      <IonIcon icon={cardOutline} slot="start" />
                      <IonLabel>Accounts</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/bills" routerDirection="root">
                      <IonIcon icon={timeOutline} slot="start" />
                      <IonLabel>Bills</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/calendar" routerDirection="root">
                      <IonIcon icon={calendarOutline} slot="start" />
                      <IonLabel>Calendar</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/analytics" routerDirection="root">
                      <IonIcon icon={pieChartOutline} slot="start" />
                      <IonLabel>Analytics</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/settings" routerDirection="root">
                      <IonIcon icon={settingsOutline} slot="start" />
                      <IonLabel>Settings</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/notifications" routerDirection="root">
                      <IonIcon icon={notificationsOutline} slot="start" />
                      <IonLabel>Notifications</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                  <IonMenuToggle>
                    <IonItem routerLink="/profile" routerDirection="root">
                      <IonIcon icon={personCircleOutline} slot="start" />
                      <IonLabel>Profile</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                </IonList>
              </IonContent>
            </IonMenu>

            <IonRouterOutlet id="main-content">
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
              <Route exact path="/transactions" render={() => (
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              )} />
              <Route exact path="/ledger" render={() => <Redirect to="/transactions" />} />
              <Route exact path="/bills" render={() => (
                <PrivateRoute>
                  <Bills />
                </PrivateRoute>
              )} />
              <Route exact path="/transactions/new" render={() => (
                <PrivateRoute>
                  <AddTransaction />
                </PrivateRoute>
              )} />
              <Route exact path="/categories/select" render={() => (
                <PrivateRoute>
                  <CategoryPicker />
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
          </>
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
