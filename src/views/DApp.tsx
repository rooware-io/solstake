import React, { useEffect, useState } from 'react';
//import logo from './logo.svg';
import '../App.css';
import { AppBar, Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Menu, MenuItem, Select, TextField, Toolbar, Typography } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import { PublicKey } from '@solana/web3.js';
import { findStakeAccountMetas, StakeAccountMeta } from '../utils/stakeAccounts';
import { StakeAccountCard } from '../components/StakeAccount';
import { ReactComponent as SolstakeTextOnlySvg } from '../solstake-text-only.svg';
import { Info } from '@material-ui/icons';
import { Connector } from '../components/Connector';
import { useWallet } from '../contexts/wallet';
import { AppSettings } from '../components/AppSettings';
import { useConnection } from '../contexts/connection';

const demoStakeAccounts: StakeAccountMeta[] = [
  {address: new PublicKey(0), seed: 'stake:0', balance: 123.23, inflationRewards: []},
  {address: new PublicKey(0), seed: 'stake:1', balance: 221.0, inflationRewards: []},
  {address: new PublicKey(0), seed: 'stake:2', balance: 1, inflationRewards: []}
];

function StakeAccounts({stakeAccountMetas}: {stakeAccountMetas: StakeAccountMeta[] | null}) {
  if (!stakeAccountMetas) {
    return (<></>);
  }
  else if (stakeAccountMetas.length === 0) {
    return (
      <Typography>
        No stake account found
      </Typography>
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
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
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
    <>
      <AppBar style={{backgroundColor: '#fdc100'}} position="relative">
        <Toolbar>
            <SolstakeTextOnlySvg className="App-logo" />
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
      <Menu
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={false}
      >
          <MenuItem>Demo</MenuItem>
      </Menu>
      <Container maxWidth="md">
        {!connected ? (
          <Box m={1}>
          <TextField
            id="standard-basic"
            fullWidth={true}
            label="Wallet public key"
            value={publicKey?.toBase58()}
            error={errorInfo !== null}
            helperText={errorInfo}
            onChange={async function(e) {
              try {
                setErrorInfo(null);
                setPublicKey(new PublicKey(e.target.value));
              }
              catch {
                console.log(`${e.target.value} is not a valid PublicKey input`);

                setErrorInfo('Invalid public key');
                setPublicKey(null);
              }
            }}
          />
          </Box>
          ) : (
          null
        )}

        <Container>
          {loading ? (
              <Skeleton height={200}></Skeleton>
            ) : <StakeAccounts stakeAccountMetas={stakeAccounts} />
          }
        </Container>
      </Container>
      
      <Dialog
        //title="Email sent!"
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
              Paste your wallet public key (Stake account authority) to view your stake state, rewards and more
            </Typography>
            <Typography>
              For in-depth staking documentation about solana staking head to <Link href="https://docs.solana.com/staking">Solana staking documentation</Link>
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
    </>
  );
}

export default DApp;
