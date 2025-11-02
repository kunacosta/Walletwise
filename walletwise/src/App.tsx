import React from 'react';
import { setupIonicReact } from '@ionic/react';
import { AppRouter } from './routes/AppRouter';

setupIonicReact();

const App: React.FC = () => {
  console.log('App renders');
  return <AppRouter />;
};

export default App;
