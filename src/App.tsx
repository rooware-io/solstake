import './App.css';
import {
  HashRouter as Router,
  Route
} from 'react-router-dom';
import DApp from './views/DApp';
import { Landing } from './views/Landing';
import { Wallet } from './contexts/wallet';
import { Theme } from './contexts/theme';
import { EpochProvider } from './contexts/epoch';
import { AccountsProvider } from './contexts/accounts';
import { ValidatorsProvider } from './contexts/validators';

function App() {
  return (
    <Theme>
      <Wallet>
        <AccountsProvider>
          <EpochProvider>
            <ValidatorsProvider>
              <Router>
                <Route exact path='/' component={Landing} />
                <Route path={['/app/validator/:validator', '/app']} component={DApp} />
              </Router>
            </ValidatorsProvider>
          </EpochProvider>
        </AccountsProvider>
      </Wallet>
    </Theme>
  );
}

export default App;
