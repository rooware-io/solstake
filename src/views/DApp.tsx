import React, { useEffect, useState } from 'react';
//import logo from './logo.svg';
import '../App.css';
import { AppBar, Box, Button, Card, CardContent, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Toolbar, Typography } from '@material-ui/core';
import { PublicKey } from '@solana/web3.js';
import { findStakeAccountMetas, StakeAccountMeta } from '../utils/stakeAccounts';
import { StakeAccountCard } from '../components/StakeAccount';
import { ReactComponent as SolstakeLogoSvg } from '../assets/logo-gradient.svg';
import { Info } from '@material-ui/icons';
import { Connector } from '../components/Connector';
import { useWallet } from '../contexts/wallet';
import { AppSettings } from '../components/AppSettings';
import { useConnection } from '../contexts/connection';
import { SummaryCard } from '../components/SummaryCard';

function StakeAccounts({stakeAccountMetas}: {stakeAccountMetas: StakeAccountMeta[] | null}) {
  if (!stakeAccountMetas) {
    return (<></>);
  }
  else if (stakeAccountMetas.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography>
            No stake account found
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {stakeAccountMetas.map(
        meta => (<StakeAccountCard stakeAccountMeta={meta} />))
      }
    </>
  );
}

function DApp() {
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountMeta[] | null>(null);
  const [open, setOpen] = useState(false);
  
  function handleClose() {
    setOpen(false);
  }
  
  async function fetchStakeAccounts(pk: PublicKey) {
    setStakeAccounts(await findStakeAccountMetas(connection, pk));
    setLoading(false);
  }

  useEffect(() => {
    setStakeAccounts(null);
    const newPublicKey = connected ? wallet?.publicKey : publicKey;
    if (newPublicKey) {
      setLoading(true);
      fetchStakeAccounts(newPublicKey);
    }
  }, [connection, connected, wallet?.publicKey, publicKey]);
  
  return (
    <div id="dapp">
      <AppBar position="relative">
        <Toolbar>
            <SolstakeLogoSvg className="App-logo" />
            <div style={{flexGrow: 1}}></div>
            <div style={{display: 'flex', gap: '10px'}}>
            <IconButton onClick={() => { setOpen(true); }}>
              <Info />
            </IconButton>
            <Button variant="contained" disabled>Demo</Button>
            <Connector />
            <AppSettings />
            </div>
        </Toolbar>
      </AppBar>
      <Box m={1} />
      <Container maxWidth="md">
        <SummaryCard
          connection={connection}
          connected={connected}
          publicKey={publicKey}
          setPublicKey={setPublicKey} />

        <Container>
          {loading ? (
              <Box m={1}>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <CircularProgress />
                </div>
              </Box>
            ) : <StakeAccounts stakeAccountMetas={stakeAccounts} />
          }
        </Container>
      </Container>
      
      <Dialog
        fullWidth={true}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>
          <Typography variant="h4">
            How to use solstake?
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box m={1}>
            <Typography>
              Paste your wallet public key (Stake account authority) or connect your wallet to view your stake state, rewards and more
            </Typography>
            <Typography>
              For in-depth staking documentation about solana staking head to <Link color="secondary" href="https://docs.solana.com/staking" target="_blank">Solana staking documentation</Link>
            </Typography>
            <Typography style={{visibility: 'hidden'}}>Spacer</Typography>
            <Typography variant="h5">
              Coming soon
            </Typography>
            <Typography>
              Create stake accounts, delegate to validators, unstake, reward overview... All from any popular wallet: solflare, sollet, phantom, ledger... 
            </Typography>
          </Box>
        </DialogContent>
  
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default DApp;
