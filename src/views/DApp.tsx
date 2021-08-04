import React, { useEffect, useState } from 'react';
// import '../App.css';
import { AppBar, Box, Button, Card, CardContent, CircularProgress, Container, IconButton, Toolbar, Tooltip, Typography } from '@material-ui/core';
import { AccountInfo, Connection, Context, KeyedAccountInfo, ParsedAccountData, PublicKey } from '@solana/web3.js';
import {
  Link as RouterLink
} from 'react-router-dom';
import { accounInfoToStakeAccount as accountInfoToStakeAccount, findStakeAccountMetas, sortStakeAccountMetas, StakeAccountMeta } from '../utils/stakeAccounts';
import { StakeAccountCard } from '../components/StakeAccount';
import { ReactComponent as SolstakeLogoSvg } from '../assets/logo-white.svg';
import { Info } from '@material-ui/icons';
import { Connector } from '../components/Connector';
import { useWallet } from '../contexts/wallet';
import { AppSettings } from '../components/AppSettings';
import { ENDPOINTS, useConnection, useConnectionConfig } from '../contexts/connection';
import { SummaryCard } from '../components/SummaryCard';
import HelpDialog from '../components/HelpDialog';
import { STAKE_PROGRAM_ID } from '../utils/ids';
import { sleep } from '../utils/utils';

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

async function onStakeAccountChangeCallback(connection: Connection, keyedAccountInfo: KeyedAccountInfo, _context: Context, stakeAccounts: StakeAccountMeta[] | null, walletPublicKey: PublicKey): Promise<StakeAccountMeta[] | undefined> {
  const {accountId, accountInfo} = keyedAccountInfo;
  console.log(`StakeAccount update for ${accountId.toBase58()}`);

  const index = stakeAccounts?.findIndex(extistingStakeAccountMeta =>
    extistingStakeAccountMeta.address.equals(accountId)
  ) ?? -1;
  let updatedStakeAccounts = stakeAccounts ? [...stakeAccounts] : [];

  // Ideally we should just subscribe as jsonParsed, but that isn't available through web3.js
  const {value} = await connection.getParsedAccountInfo(accountId);
  const parsedAccountInfo = value;
  console.log(accountInfo.lamports, accountInfo.data, accountInfo.owner.toBase58());
  if (!parsedAccountInfo) {
    // The account can no longer be found, it has been closed
    if (index > -1) {
      updatedStakeAccounts.splice(index, 1);
      return updatedStakeAccounts;
    }
    return;
  }
  const newStakeAccount = accountInfoToStakeAccount(parsedAccountInfo);
  if (!newStakeAccount) {
    console.log(`Could no find parsed data: ${accountId.toBase58()}`);
    return;
  }

  if (index === -1) {
    console.log(`Could not find existing stake account for address, adding: ${stakeAccounts?.length} ${newStakeAccount}`);
    const naturalStakeAccountSeedPubkeys = await Promise.all(Array.from(Array(20).keys()).map(async i => {
      const seed = `${i}`;
      return PublicKey.createWithSeed(walletPublicKey, seed, STAKE_PROGRAM_ID).then(pubkey => ({seed, pubkey}));
    }));

    const seed = naturalStakeAccountSeedPubkeys.find(element => element.pubkey.equals(accountId))?.seed ?? 'N.A.';
    updatedStakeAccounts.push({
      address: accountId,
      seed,
      lamports: parsedAccountInfo.lamports,
      stakeAccount: newStakeAccount,
      inflationRewards: [] // In 99.999% of cases this should be correct
    });
  }
  else {
    updatedStakeAccounts[index].stakeAccount = newStakeAccount;
  }

  sortStakeAccountMetas(updatedStakeAccounts);
  return updatedStakeAccounts;
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

  async function addStakeAccount(stakeAccountPublicKey: PublicKey, seed: string) {
    if (!stakeAccounts) {
      return;
    }
    let newStakeAccounts = [...stakeAccounts];

    // Try a few times with standoff
    let parsedAccountInfo: AccountInfo<Buffer | ParsedAccountData> | null = null;
    for (let i = 0;i < 5;i++) {
      parsedAccountInfo = (await connection.getParsedAccountInfo(stakeAccountPublicKey)).value;
      if (parsedAccountInfo) {
        break;
      }
      else {
        await sleep(600);
      }
    }
    if (!parsedAccountInfo) {
      console.log('Did not find new account after retries');
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
    if (!wallet?.publicKey) {
      return;
    }
    let walletPublicKey = wallet.publicKey;

    const subscriptionId = connection.onProgramAccountChange(
      STAKE_PROGRAM_ID,
      async (keyedAccountInfo, context) => {
        const updatedStakeAccounts = await onStakeAccountChangeCallback(
          connection,
          keyedAccountInfo,
          context,
          stakeAccounts,
          walletPublicKey,
        );
        if (updatedStakeAccounts) {
          setStakeAccounts(updatedStakeAccounts);
        }
      },
      connection.commitment,
      [{
        memcmp: {
          offset: 12,
          bytes: wallet.publicKey.toBase58()
        }
      }]
    );

    return () => {
      console.log('removeProgramAccountChangeListener');
      connection.removeProgramAccountChangeListener(subscriptionId);
    };
  }, [connection, wallet, stakeAccounts]);

  // Unfortunately we need to listen again because closing accounts do not notify above
  // In addition, subscription above is bugged and often drops notifications https://github.com/solana-labs/solana/issues/18587
  useEffect(() => {
    const subscriptionIds = stakeAccounts?.map(stakeAccountMeta => {
      return connection.onAccountChange(stakeAccountMeta.address, async (accountInfo, context) => {
        const updatedStakeAccounts = await onStakeAccountChangeCallback(
          connection,
          {
            accountId: stakeAccountMeta.address,
            accountInfo
          },
          context,
          stakeAccounts,
          PublicKey.default,
        );
        if (updatedStakeAccounts) {
          setStakeAccounts(updatedStakeAccounts);
        }
      });
    });

    // Necessary subscription cleanup
    return () => {
      subscriptionIds?.forEach(id => {
        connection.removeAccountChangeListener(id);
      })
    };
  }, [connection, stakeAccounts]);
  
  return (
    <div id="dapp" className="h-full">
      {/* Header */}
      <div className="h-20 flex flex-wrap justify-between px-10 py-4">
        <div className="h-full w-1/6">
          <SolstakeLogoSvg />
        </div>

        <div>
          <span>connect</span>
        </div>
      </div>

      {/* Main flex wrapper */}
      <div className="h-full p-10 text-center">

        <div className="leading-none flex flex-wrap md:inline-flex sm:w-full md:w-11/12 lg:w-11/12 xl:w-4/5 2xl:w-2/3">
          {/* Epoch area */}
          <div className="h-full w-full mb-3 solBoxBlue">
            <div className="p-5">
              <p className='text-3xl uppercase'>Epoch 201</p>
            </div>
            {/* Progress bar */}
            <p className="pb-2 text-xl">55%</p>
            <div className="mx-5 mb-2 bg-white rounded-full">
              <div className="shadow w-full bg-grey-light">
                <div className="bg-solacid rounded-full text-xs leading-none border-4 border-white py-1 text-center text-solblue-dark" style={{width: '55%'}}></div>
              </div>
            </div>
            <p className="pb-3 text-xs text-solgray-light">estimated time remaining <span className="font-bold">2d 10h 2m</span></p>
          </div>


          {/* Connect area */}
          <div className="h-full w-full my-3 flex flex-wrap justify-between text-center">
            {/* Input wallet key */}
            <div className="w-full lg:w-4/5 text-solblue-dark">
              <div className="border-b border-gray-600">
                <input className="w-full h-7 px-5 text-xs placeholder-gray-600 border-none bg-transparent" type="text" placeholder="Public Key / Wallet Address"/>
              </div>
              {/* <!-- <span className="text-xs text-red-700">Public Key not valid. Please check.</span> --> */}
            </div>

            {/* Connect wallet button */}
            <div className="pb-4 pt-2 lg:pt-0 text-center lg:text-right w-full lg:w-1/5">
              <button className="solBtnGray pb-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Connect Wallet
              </button>
            </div>

            {/* connectED wallet */}
            <div className="solBoxBlue w-full font-light flex flex-wrap justify-between items-center">
              <div className="pl-5 pt-1">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  8BaNJXqMAEVrV7cgzEjW66G589ZmDvwajmJ7t32WspanvxW
                </span>
              </div>
              {/* buttons change/disconect */}
              <div className="w-full lg:w-2/5 p-3 text-center md:text-right">
                <button className="solBtnGray mr-2">Change Wallet</button>
                <button className="solBtnGray">Disconect</button>
              </div>
            </div>       
          </div>

          {/* Wallet balance */}
          <div className="solBoxGray w-full font-light flex flex-wrap md:justify-between items-center text-center">
            <div className="w-0 md:w-1/3"></div>
            <div className="pb-3 pt-4 w-full md:w-1/3 md:pl-5">
              <p className="uppercase">Wallet Balance</p>
              <p className="font-normal text-xl">32.23 SOL</p>
              <p className="text-xs">$653.32</p>
            </div>
            <div className="w-full pb-5 md:pb-0 md:w-1/3 md:pr-10 md:text-right">
              <button className="solBtnGray whitespace-nowrap">Create Stake Account</button>
            </div>
          </div>

          <div className="w-full mt-3 flex flex-wrap md:justify-between items-center text-center">
            <div className="w-full pb-3 lg:border-r-4 lg:border-transparent">
              {/* pie chart */}
              <div className="solBoxGray h-44 p-3.5 w-full font-light items-center text-center uppercase flex flex-wrap justify-center">
                {/* pie chart - css from added.css */}
                <div className="px-5">
                  {/* Percentage setting */}
                  <div className="chart x-65">
                    <p className="pb-1">
                      <span className="text-xs leading-none">Total<br />Staked</span>
                      <br />
                      <span className="font-bold leading-6">231.11 SOL</span>
                      <br />
                      <span className="text-xs">$43,231.11</span>
                    </p>
                  </div>
                </div>
                <div className="px-5">
                  <div className="text-left uppercase leading-5 pb-3">
                    <p>
                        <p className="bg-solblue-dark w-3 h-3 inline-block"></p>
                        <span className="text-light text-gray-400 leading-6 pl-1">Initial Stake</span>
                        <br />
                        <span className="font-bold pl-5">231.11 SOL</span>
                        <br />
                        <span className="text-xs text-light text-gray-400 pl-5">$43,231.11</span>
                    </p>
                  </div>
                  <div className="text-left uppercase leading-5">
                    <p>
                      <p className="bg-solacid w-3 h-3 inline-block"></p>
                      <span className="text-light text-gray-400 leading-6 pl-1">Total Rewards</span>
                      <br />
                      <span className="font-bold pl-5">231.11 SOL</span>
                      <br />
                      <span className="text-xs text-light text-gray-400 pl-5">$43,231.11 / 6.3% APY</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <AppBar position="relative">
        <Toolbar>
            <RouterLink to="/" style={{width: '15%'}}>
              <Box m={1}>
                <SolstakeLogoSvg className="App-logo" />
              </Box>
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

      <Box m="1">
        <br />
      </Box>

      <HelpDialog
        open={open}
        handleClose={() => setOpen(false)}
      />
    </div>
  );
}

export default DApp;
