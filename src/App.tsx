import React from 'react';
//import logo from './logo.svg';
import './App.css';
import {
  BrowserRouter as Router,
  Route
} from 'react-router-dom';
import DApp from './views/DApp';
import { Landing } from './views/Landing';
import { ConnectionProvider } from './contexts/connection';
import { WalletProvider } from './contexts/wallet';

function App() {
  return (
    <ConnectionProvider>
      <WalletProvider>
        <Router>
          <Route exact path='/' component={Landing} />
          <Route path='/app' component={DApp} />
        </Router>    
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
