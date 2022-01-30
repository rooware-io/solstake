import './App.css';
import {
  HashRouter,
  Routes,
  Route,
} from 'react-router-dom';
import DApp from './views/DApp';
import Landing from './views/Landing';
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
              <HashRouter>
                <Routes>
                  <Route path='/' element={<Landing />} />
                  <Route path='/app' element={<DApp />} />
                  <Route path='/app/validator/:validator' element={<DApp />} />
                </Routes>
              </HashRouter>
            </ValidatorsProvider>
          </EpochProvider>
        </AccountsProvider>
      </Wallet>
    </Theme>
  );
}

export default App;
