import React from 'react';
import ReactDOM from 'react-dom/client';
import { onAuthStateChanged, type User } from 'firebase/auth';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './style.css';
import App from './App';
import { auth } from './services/firebase';
import { useAuthStore } from './state/useAuthStore';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const authStore = useAuthStore.getState();
authStore.setLoading(true);
console.log('Auth listener attaching');

const detachAuthListener = onAuthStateChanged(
  auth,
  (currentUser: User | null) => {
    console.log('Auth state change', currentUser ? { uid: currentUser.uid } : { uid: null });
    authStore.setAuthState(currentUser, false);
  },
  (error) => {
    console.error('Auth listener error', error);
    authStore.setAuthState(null, false);
  },
);

console.log('Auth listener attached');

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachAuthListener();
  });
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
