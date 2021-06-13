import React from 'react';
//import logo from './logo.svg';
import './App.css';
import {
  HashRouter as Router,
  Route
} from 'react-router-dom';
import DApp from './views/DApp';
import { Landing } from './views/Landing';
import { ConnectionProvider } from './contexts/connection';
import { WalletProvider } from './contexts/wallet';
import { ThemeProvider } from '@material-ui/core';
import { theme } from './assets/theme';
import { EpochProvider } from './contexts/epoch';
import { AccountsProvider } from './contexts/accounts';

function App() {
  return (
    <ConnectionProvider>
      <WalletProvider>
        <AccountsProvider>
          <EpochProvider>
            <ThemeProvider theme={theme}>
              <Router>
                <Route exact path='/' component={Landing} />
                <Route path='/app' component={DApp} />
              </Router>
            </ThemeProvider>
          </EpochProvider>
        </AccountsProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
