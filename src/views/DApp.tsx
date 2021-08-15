import React, { useEffect, useState } from 'react';
import { Button, CircularProgress, IconButton, Tooltip } from '@material-ui/core';
import { AccountInfo, Connection, Context, KeyedAccountInfo, ParsedAccountData, PublicKey } from '@solana/web3.js';
import {
  Link as RouterLink
} from 'react-router-dom';
import { accounInfoToStakeAccount as accountInfoToStakeAccount, findStakeAccountMetas, sortStakeAccountMetas, StakeAccountMeta } from '../utils/stakeAccounts';
import { StakeAccountCard } from '../components/StakeAccount';
import { ReactComponent as SolstakeLogoSvg } from '../assets/logo-white.svg';
import { Info } from '@material-ui/icons';
import { Brightness6 } from '@material-ui/icons';
import { useWallet } from '../contexts/wallet';
import { ENDPOINTS, useConnection, useConnectionConfig } from '../contexts/connection';
import HelpDialog from '../components/HelpDialog';
import { STAKE_PROGRAM_ID } from '../utils/ids';
import { sleep } from '../utils/utils';
import Epoch from '../components/Epoch';
import WalletSummary from '../components/WalletSummary';
import WalletConnector from '../components/WalletConnector';
const DEMO_PUBLIC_KEY_STRING = '8BaNJXqMAEVrV7cgzEjW66G589ZmDvwajmJ7t32WpvxW';

function StakeAccounts({stakeAccountMetas}: {stakeAccountMetas: StakeAccountMeta[]}) {
  if (stakeAccountMetas.length === 0) {
    return (
      <div className="solBoxGray w-full font-light flex flex-wrap md:justify-between items-center text-center">
        <div className="pb-3 pt-4 w-full md:pl-5">
          <p>
            No stake account found
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {stakeAccountMetas.map(
        meta => <StakeAccountCard key={meta.address.toBase58()} stakeAccountMeta={meta} />
      )}
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

function ClusterSelector() {
  const { url, setUrl } = useConnectionConfig();

  return (
    <select
      className="solBtnGray"
      value={url}
      onChange={e => setUrl(e.target.value as string)}
    >
      {ENDPOINTS.map(({ name, url }) => (
        <option value={url} key={url}>
          {name}
        </option>
      ))}
    </select>
  );
}

function DApp() {
  const connection = useConnection();
  const { setUrl } = useConnectionConfig();
  const { wallet, connected, disconnect } = useWallet();
  const [publicKeyString, setPublicKeyString] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountMeta[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStakeAccounts(null);
    let keyedPublicKey: PublicKey | undefined
    if (publicKeyString) {
      try {
        keyedPublicKey = new PublicKey(publicKeyString)
      }
      catch {}
    }
    const newPublicKey = connected ? wallet?.publicKey : keyedPublicKey;
    if (newPublicKey) {
      setLoading(true);
      findStakeAccountMetas(connection, newPublicKey)
        .then(newStakeAccounts => {
          setStakeAccounts(newStakeAccounts);
          setLoading(false);
        });
    }
  }, [connection, connected, wallet?.publicKey, publicKeyString]);

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
        <div className="h-full xl:w-1/6 w-1/3 pt-2">
          <RouterLink to="/">
            <SolstakeLogoSvg />
          </RouterLink>
        </div>
        
        <div>    
          <IconButton>
            <Brightness6 />
          </IconButton>        
        
          <IconButton onClick={() => {setOpen(true); }}>
            <Info />
          </IconButton>
          <div className="inline-block m-2">
            <Tooltip title="Use known stake account authority">
              <button className="solBtnGray p-0 m-0"
                onClick={() => {
                  disconnect();
                  setUrl(ENDPOINTS[0].url);
                  setPublicKeyString(DEMO_PUBLIC_KEY_STRING);
                }}
              >
                Demo
              </button>
            </Tooltip>
          </div>
          <ClusterSelector />
        </div>
      </div>

      {/* Main flex wrapper */}
      <div className="h-full p-10 text-center">

        <div className="leading-none flex flex-wrap md:inline-flex sm:w-full md:w-11/12 lg:w-11/12 xl:w-4/5 max-w-screen-xl">
          <Epoch />

          <WalletConnector
            publicKeyString={publicKeyString}
            setPublicKeyString={setPublicKeyString}
          />

          <WalletSummary
            stakeAccountMetas={stakeAccounts}
            addStakeAccount={addStakeAccount}
          />

          {loading && (
            <div className="pb-3 pt-4 w-full md:pl-5">
              <CircularProgress color="secondary" />
            </div>
          )}
          {stakeAccounts && (
            <StakeAccounts stakeAccountMetas={stakeAccounts} />
          )}

        </div>
      </div>

      <HelpDialog
        open={open}
        handleClose={() => setOpen(false)}
      />
    </div>
  );
}

export default DApp;
