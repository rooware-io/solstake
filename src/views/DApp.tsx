import React, { useEffect, useState } from 'react';
//import logo from './logo.svg';
import '../App.css';
import { AppBar, Box, Button, Card, CardContent, CircularProgress, Container, IconButton, Toolbar, Tooltip, Typography } from '@material-ui/core';
import { PublicKey } from '@solana/web3.js';
import {
  Link as RouterLink
} from 'react-router-dom';
import { accounInfoToStakeAccount as accountInfoToStakeAccount, findStakeAccountMetas, sortStakeAccountMetas, StakeAccountMeta } from '../utils/stakeAccounts';
import { StakeAccountCard } from '../components/StakeAccount';
import { ReactComponent as SolstakeLogoSvg } from '../assets/logo-gradient.svg';
import { Info } from '@material-ui/icons';
import { Connector } from '../components/Connector';
import { useWallet } from '../contexts/wallet';
import { AppSettings } from '../components/AppSettings';
import { ENDPOINTS, useConnection, useConnectionConfig } from '../contexts/connection';
import { SummaryCard } from '../components/SummaryCard';
import HelpDialog from '../components/HelpDialog';

const DEMO_PUBLIC_KEY_STRING = '8BaNJXqMAEVrV7cgzEjW66G589ZmDvwajmJ7t32WpvxW';

function StakeAccounts({stakeAccountMetas}: {stakeAccountMetas: StakeAccountMeta[]}) {
  if (stakeAccountMetas.length === 0) {
    return (
      <Box m={1}>
        <Card>
          <CardContent>
            <Typography>
              No stake account found
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <>
      {stakeAccountMetas.map(
        meta => (<StakeAccountCard key={meta.address.toBase58()} stakeAccountMeta={meta} />))
      }
    </>
  );
}

function DApp() {
  const connection = useConnection();
  const { setUrl } = useConnectionConfig();
  const { wallet, connected, disconnect } = useWallet();
  const [publicKeyString, setPublicKeyString] = useState<string>();
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountMeta[] | null>(null);
  const [open, setOpen] = useState(false);

  async function addStakeAccount(stakeAccountPublicKey: PublicKey, seed: string) {
    if (!stakeAccounts) {
      return;
    }
    let newStakeAccounts = [...stakeAccounts];

    const parsedAccountInfo = (await connection.getParsedAccountInfo(stakeAccountPublicKey)).value;
    if (!parsedAccountInfo) {
      console.log('Did not find new account');
      return;
    }
    const stakeAccount = accountInfoToStakeAccount(parsedAccountInfo);
    if (!stakeAccount) {
      return;
    }
    newStakeAccounts.push({
      address: stakeAccountPublicKey,
      seed,
      lamports: parsedAccountInfo.lamports,
      stakeAccount,
      inflationRewards: []
    });
    sortStakeAccountMetas(newStakeAccounts);
    setStakeAccounts(newStakeAccounts);
  }

  useEffect(() => {
    setStakeAccounts(null);
    const newPublicKey = connected ? wallet?.publicKey : publicKey;
    if (newPublicKey) {
      setLoading(true);
      findStakeAccountMetas(connection, newPublicKey)
        .then(newStakeAccounts => {
          setStakeAccounts(newStakeAccounts);
          setLoading(false);
        });
    }
  }, [connection, connected, wallet?.publicKey, publicKey]);

  useEffect(() => {
    const subscriptionIds = stakeAccounts?.map(stakeAccountMeta => {
      const subscriptionId = connection.onAccountChange(stakeAccountMeta.address, async () => {
        console.log(`StakeAccount update for ${stakeAccountMeta.address.toBase58()}`);
        const index = stakeAccounts?.findIndex(extistingStakeAccountMeta => 
          extistingStakeAccountMeta.address.equals(stakeAccountMeta.address)
        );
        const parsedAccountInfo = (await connection.getParsedAccountInfo(stakeAccountMeta.address)).value;
        if (!parsedAccountInfo) {
          // The account can no longer be found, it has been closed
          if (index > -1) {
            let updatedStakeAccounts = [...stakeAccounts];
            updatedStakeAccounts.splice(index, 1);
            setStakeAccounts (updatedStakeAccounts);
          }
          return;
        }
        const newStakeAccount = accountInfoToStakeAccount(parsedAccountInfo);

        if (index === undefined || index === -1 || !stakeAccounts || !newStakeAccount) {
          console.log(`Could not find existing stake account for address: ${index}, ${stakeAccounts?.length} ${newStakeAccount}`);
          return;
        }
        let receivedStakeAccounts = [...stakeAccounts];
        receivedStakeAccounts[index].stakeAccount = newStakeAccount;
        setStakeAccounts(receivedStakeAccounts);
      });
      return subscriptionId;
    });

    // Necessary subscription cleanup
    return () => {
      subscriptionIds?.forEach(id => {
        connection.removeAccountChangeListener(id);
      })
    };
  }, [connection, stakeAccounts]);
  
  return (
    <div id="dapp">
      <AppBar position="relative">
        <Toolbar>
            <RouterLink to="/" style={{width: '15%'}}>
              <SolstakeLogoSvg className="App-logo" />
            </RouterLink>
            <div style={{flexGrow: 1}}></div>
            <div style={{display: 'flex', gap: '10px', padding: '5px'}}>
              <IconButton onClick={() => { setOpen(true); }}>
                <Info />
              </IconButton>
              <Tooltip title="Use known stake account authority">
                <Button
                  variant="contained"
                  onClick={() => {
                    disconnect();
                    setUrl(ENDPOINTS[0].url);
                    setPublicKeyString(DEMO_PUBLIC_KEY_STRING);
                  }}
                >
                  Demo
                </Button>
              </Tooltip>
              <Connector />
              <AppSettings />
            </div>
        </Toolbar>
      </AppBar>
      <Box m={1} />
      <Container maxWidth="md">
        <SummaryCard
          publicKeyString={publicKeyString}
          setPublicKeyString={setPublicKeyString}
          setPublicKey={setPublicKey}
          stakeAccountMetas={stakeAccounts}
          addStakeAccount={addStakeAccount}
        />

        <Container>
          {loading && (
            <Box m={1}>
              <div style={{display: 'flex', justifyContent: 'center'}}>
                <CircularProgress />
              </div>
            </Box>
          )}
          {stakeAccounts && (
            <StakeAccounts stakeAccountMetas={stakeAccounts} />
          )}
        </Container>
      </Container>
      
      <HelpDialog
        open={open}
        handleClose={() => setOpen(false)}
      />
    </div>
  );
}

export default DApp;
