import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { AppBar, Button, Container, IconButton, Link as L2, List, ListItem, ListItemText, Menu, MenuItem, TextField, Toolbar, Typography } from '@material-ui/core';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { OpenInNew, Sync } from '@material-ui/icons';
import { STAKE_PROGRAM_ID } from './utils/ids';
import { findStakeAccountMetas, StakeAccountMeta } from './utils/stakeAccounts';

const demoStakeAccounts: StakeAccountMeta[] = [
  {address: new PublicKey(0), seed: 'stake:0', balance: 123.23},
  {address: new PublicKey(0), seed: 'stake:1', balance: 221.0},
  {address: new PublicKey(0), seed: 'stake:2', balance: 1}
];

async function getStakeAccounts(basePubKey: PublicKey, index: number) {
  PublicKey.createWithSeed(basePubKey, index.toString(), STAKE_PROGRAM_ID);
}

const connection = new Connection(clusterApiUrl('mainnet-beta'))

function App() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountMeta[]>(demoStakeAccounts);
  
  return (
    <>
      <AppBar position="relative">
        <Toolbar>
          <Typography variant="h6" color="inherit" noWrap>
            Solstake
          </Typography>
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
        <Container maxWidth="sm">
          <TextField
            id="standard-basic"
            label="Public key"
            value={publicKey?.toBase58()}
            error={errorInfo !== null}
            helperText={errorInfo}
            onChange={async function(e) {
              let walletAddress: PublicKey | null;
              try {
                walletAddress = new PublicKey(e.target.value);
              }
              catch {
                console.log(`${e.target.value} is not a valid PublicKey input`);

                setErrorInfo('Invalid public key');
                setPublicKey(null);
                setStakeAccounts([]);
                return;
              }
              
              setErrorInfo(null);
              setPublicKey(walletAddress);
              setStakeAccounts([]);
              setStakeAccounts(await findStakeAccountMetas(connection, walletAddress));
            }}
          />
          <Button>
            <Sync />
          </Button>
          <List>
            {stakeAccounts.map(stakeAccount => (
              <ListItem>
                <L2 href={`https://explorer.solana.com/address/${stakeAccount.address.toBase58()}`}>
                  <OpenInNew />
                </L2>
                <ListItemText
                  primary={`${stakeAccount.seed}`}
                  secondary={`Balance: ${stakeAccount.balance} SOL`} 
                >
                </ListItemText>
              </ListItem>
            ))}
          </List>
        </Container>
      </main>
    </>
  );
}

export default App;
