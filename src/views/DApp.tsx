import React, { useEffect, useState } from 'react';
//import logo from './logo.svg';
import '../App.css';
import { AppBar, Button, Container, Menu, MenuItem, TextField, Toolbar, Typography } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { findStakeAccountMetas, StakeAccountMeta } from '../utils/stakeAccounts';
import { StakeAccountCard } from '../components/StakeAccount';
import { ReactComponent as SolstakeTextOnlySvg } from '../solstake-text-only.svg';

const demoStakeAccounts: StakeAccountMeta[] = [
  {address: new PublicKey(0), seed: 'stake:0', balance: 123.23, inflationRewards: []},
  {address: new PublicKey(0), seed: 'stake:1', balance: 221.0, inflationRewards: []},
  {address: new PublicKey(0), seed: 'stake:2', balance: 1, inflationRewards: []}
];

const connection = new Connection(clusterApiUrl('mainnet-beta'))

function DApp() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountMeta[]>(demoStakeAccounts);

  async function fetchStakeAccounts(pk: PublicKey) {
    setStakeAccounts(await findStakeAccountMetas(connection, pk));
    setLoading(false);
  }

  useEffect(() => {
    setStakeAccounts([]);
    if (publicKey !== null) {
      setLoading(true);
      fetchStakeAccounts(publicKey);
    }
  }, [publicKey]);
  
  return (
    <>
      <AppBar position="relative">
        <Toolbar>
            <SolstakeTextOnlySvg width="20%" />
            <div style={{flexGrow: 1}}></div>
            <div style={{display: 'flex', gap: '10px'}}>
            <Button variant="contained" disabled>Demo</Button>
            <Button variant="contained">Connect wallet</Button>
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
      <main>
        <Container maxWidth="md">
          <TextField
            id="standard-basic"
            fullWidth={true}
            label="Wallet public key"
            value={publicKey?.toBase58()}
            error={errorInfo !== null}
            helperText={errorInfo}
            onChange={async function(e) {
              try {
                const walletAddress = new PublicKey(e.target.value);
                setErrorInfo(null);
                setPublicKey(walletAddress);
              }
              catch {
                console.log(`${e.target.value} is not a valid PublicKey input`);

                setErrorInfo('Invalid public key');
                setPublicKey(null);
              }
            }}
          />
          <Container>
          {loading ? (<Skeleton height={200}></Skeleton>): stakeAccounts.map(
            meta => (<StakeAccountCard stakeAccountMeta={meta} />))}
          </Container>
        </Container>
      </main>
    </>
  );
}

export default DApp;
