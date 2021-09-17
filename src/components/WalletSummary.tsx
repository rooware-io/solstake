//import { Tooltip } from '@material-ui/core';
import { parsePriceData } from '@pythnetwork/client';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AccountsContext } from '../contexts/accounts';
import { useConnection, useSendConnection } from '../contexts/connection';
import { useWallet } from '../contexts/wallet';
import { STAKE_PROGRAM_ID } from '../utils/ids';
import { StakeAccountMeta } from '../utils/stakeAccounts';
import { formatPriceNumber } from '../utils/utils';
import { CreateStakeAccountDialog } from './CreateStakeAccount';

interface WalletSummaryProps {
  stakeAccountMetas: StakeAccountMeta[] | null;
  addStakeAccount: (stakePubkey: PublicKey, seed: string) => void;
}

async function getSOLPriceUSD(): Promise<number | undefined> {
  // TODO: Switch to mainnet when available
  const connection = new Connection(clusterApiUrl('devnet'));

  const SOLUSDPriceAccountKey = new PublicKey('J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix');
  const priceAccountInfo = await connection.getAccountInfo(SOLUSDPriceAccountKey);
  if (!priceAccountInfo) {
    return;
  }
  const { price, confidence } = parsePriceData(priceAccountInfo?.data);

  console.log(`price: ${price}, confidence: ${confidence}`);
  return price;
}

async function findFirstAvailableSeed(userPublicKey: PublicKey, stakeAccountMetas: StakeAccountMeta[]) {
  let seedIndex = 0;
  while(1) {
    const newStakeAccountPubkey = await PublicKey.createWithSeed(userPublicKey, seedIndex.toString(), STAKE_PROGRAM_ID);
    const matching = stakeAccountMetas.find(meta => newStakeAccountPubkey.equals(meta.address));
    if(!matching) {
      break;
    }
    seedIndex++;
  }

  return seedIndex.toString();
}

export default function WalletSummary(props: WalletSummaryProps) {
  const {stakeAccountMetas, addStakeAccount} = props;

  const connection = useConnection();
  const sendConnection = useSendConnection();
  const {wallet} = useWallet();

  const {systemProgramAccountInfo} = useContext(AccountsContext);
  const [SOLPriceUSD, setSOLPriceUSD] = useState<number>();

  const [seed, setSeed] = useState('0');
  const [open, setOpen] = useState(false);

  // useEffect(() => {
  //   getSOLPriceUSD()
  //     .then(setSOLPriceUSD);
  // }, []);

  const totalStakedSOL = useMemo(() => {
    const totalLamports = stakeAccountMetas?.reduce((sum, current) => sum + current.lamports, 0);
    return totalLamports !== undefined ? totalLamports / LAMPORTS_PER_SOL : undefined;
  }, [stakeAccountMetas]);

  // Yield first seed sequentially from unused seeds
  useEffect(() => {
    if(!stakeAccountMetas || !wallet?.publicKey) {
      return;
    }

    findFirstAvailableSeed(wallet.publicKey, stakeAccountMetas)
      .then(setSeed);
  }, [wallet, stakeAccountMetas]);

  const balance = useMemo(() => {
    return systemProgramAccountInfo && (systemProgramAccountInfo.lamports / LAMPORTS_PER_SOL);
  }, [systemProgramAccountInfo])

  const ratio = useMemo(() => {
    if (totalStakedSOL === undefined || balance === null) return;
    return Math.floor(totalStakedSOL / (totalStakedSOL + balance) * 100)
  }, [balance, totalStakedSOL])

  if (!systemProgramAccountInfo) {
    return <></>;
  }

  return (
    <>
      {/* Wallet balance */}
      <div className="solBoxGray w-full font-light flex flex-wrap md:justify-between items-center text-center">
        <div className="w-0 md:w-1/3"></div>
        <div className="pb-3 pt-4 w-full md:w-1/3 md:pl-5">
          <p className="uppercase">Wallet Balance</p>
          <p className="font-normal text-xl">{balance} SOL</p>
          <p className="text-xs">
            ${(balance && SOLPriceUSD) ? formatPriceNumber.format(balance * SOLPriceUSD) : '-'} ({SOLPriceUSD ? formatPriceNumber.format(SOLPriceUSD) : '-'} $/SOL)
            {/* <Tooltip title="On-chain SOL price from pyth.network oracle">
              <div>
                <img src="pyth-icon-48x48.png" alt="PythNetwork" />
              </div>
            </Tooltip> */}
          </p>
        </div>
        <div className="w-full pb-5 md:pb-0 md:w-1/3 md:pr-10 md:text-right">
          <button
            className="solBtnGray whitespace-nowrap"
            onClick={() => setOpen(true)}
          >
            Create Stake Account
          </button>
        </div>
      </div>

      { wallet && open &&
        <CreateStakeAccountDialog
          seed={seed}
          open={open}
          setOpen={setOpen}
          connection={connection}
          sendConnection={sendConnection}
          wallet={wallet}
          onSuccess={async () => {
            if (!wallet.publicKey) {
              return;
            }
            const newStakeAccountPubkey = await PublicKey.createWithSeed(wallet.publicKey, seed, STAKE_PROGRAM_ID);
            addStakeAccount(newStakeAccountPubkey, seed);
          }}
        />
      }

      <div className="w-full mt-3 flex flex-wrap md:justify-between items-center text-center">
        <div className="w-full pb-3 lg:border-r-4 lg:border-transparent">
          {/* pie chart */}
          <div className="solBoxGray h-44 p-3.5 w-full font-light items-center text-center uppercase flex flex-wrap justify-center">
            {/* pie chart - css from added.css */}
            <div className="px-5">
              {/* Percentage setting */}
              <div className="chart" style={{backgroundImage: `conic-gradient(#D5E300 ${ratio}%, #103147 ${ratio}%)`}}>
                <p className="pb-1">
                  <span className="text-xs leading-none">Total<br />Staked</span>
                  <br />
                  <span className="font-bold leading-6">{totalStakedSOL !== undefined ? formatPriceNumber.format(totalStakedSOL) : '-'} SOL</span>
                  <br />
                  <span className="text-xs">
                    ${(SOLPriceUSD && totalStakedSOL !== undefined) ? formatPriceNumber.format(totalStakedSOL * SOLPriceUSD) : '-'}
                  </span>
                </p>
              </div>
            </div>
            <div className="px-5">
              <div className="text-left uppercase leading-5 pb-3">
                <p>
                  <p className="bg-solblue-dark w-3 h-3 inline-block"></p>
                  <span className="text-light text-gray-400 leading-6 pl-1">Balance</span>
                  {/* <br />
                  <span className="font-bold pl-5">123.11 SOL</span>
                  <br />
                  <span className="text-xs text-light text-gray-400 pl-5">$43,231.11</span> */}
                </p>
              </div>
              <div className="text-left uppercase leading-5">
                <p>
                  <p className="bg-solacid w-3 h-3 inline-block"></p>
                  <span className="text-light text-gray-400 leading-6 pl-1">Total staked</span>
                  {/* <br />
                  <span className="font-bold pl-5">123.11 SOL</span>
                  <br />
                  <span className="text-xs text-light text-gray-400 pl-5">$43,231.11 / 6.3% APY</span> */}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
