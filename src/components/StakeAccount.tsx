import { Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, List, ListItem, ListItemText, TextField, Tooltip, Typography } from "@material-ui/core";
import { ExpandLess, ExpandMore, OpenInNew } from "@material-ui/icons";
import { LAMPORTS_PER_SOL, PublicKey, StakeActivationData, StakeProgram } from "@solana/web3.js";
import BN from "bn.js";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { sendTransaction, useConnection, useSendConnection, useSolanaExplorerUrlSuffix } from "../contexts/connection";
import { EpochContext } from "../contexts/epoch";
import { useWallet } from "../contexts/wallet";
import { getFirstBlockTime } from "../utils/block";
import { useMonitorTransaction } from "../utils/notifications";
import { StakeAccountMeta } from "../utils/stakeAccounts";
import { formatPct, shortenAddress } from "../utils/utils";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";
import { DelegateDialog } from "./DelegateDialog";

const MAX_EPOCH = new BN(2).pow(new BN(64)).sub(new BN(1));

export function StakeAccountCard({stakeAccountMeta}: {stakeAccountMeta: StakeAccountMeta}) {
  const connection = useConnection();
  const sendConnection = useSendConnection();
  const {wallet, connected} = useWallet();
  const {monitorTransaction} = useMonitorTransaction();
  const urlSuffix = useSolanaExplorerUrlSuffix();
  const { epochSchedule, epochStartTime } = useContext(EpochContext);

  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [stakeActivationData, setStakeActivationData] = useState<StakeActivationData>();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [activatedBlockTime, setActivatedBlockTime] = useState<number>();

  function formatEpoch(epoch: BN) {
    return epoch.eq(MAX_EPOCH) ? '-' : epoch.toString();
  }

  useEffect(() => {
    console.log(`${(connection as any)._rpcEndpoint}, ${stakeAccountMeta.address.toBase58()}`);
    connection.getStakeActivation(stakeAccountMeta.address)
      .then(setStakeActivationData)
      .catch(error => {
        console.log(`Failed: ${error}`);
        setStakeActivationData(undefined);
      });
    // Hidden dependency as we update only the underlying data
    // eslint-disable-next-line
  }, [connection, stakeAccountMeta, stakeAccountMeta.stakeAccount]);

  const totalRewards = useMemo(() => {
    return stakeAccountMeta.inflationRewards.reduce((sum, current) => sum + current.amount, 0)
  }, [stakeAccountMeta]);

  useEffect(() => {
    setActivatedBlockTime(undefined);
    if(!stakeAccountMeta.stakeAccount.info.stake || !epochSchedule) {
      return;
    }

    const firstActivatedSlot = epochSchedule.getFirstSlotInEpoch(
      stakeAccountMeta.stakeAccount.info.stake.delegation.activationEpoch.toNumber() + 1
    );
    getFirstBlockTime(connection, firstActivatedSlot)
      .then(setActivatedBlockTime);
  }, [connection, stakeAccountMeta, epochSchedule]);

  const APY = useMemo(() => {
    const initialStake = stakeAccountMeta.lamports - totalRewards;
    if(!epochStartTime || !activatedBlockTime) {
      return;
    }

    const timePeriod = epochStartTime - activatedBlockTime;
    console.log(`timePeriod: ${timePeriod}, epochStartTime: ${epochStartTime}, activatedBlockTime: ${activatedBlockTime}`);
    return totalRewards / initialStake / timePeriod * 365 * 24 * 60 * 60;
  }, [stakeAccountMeta, totalRewards, epochStartTime, activatedBlockTime])

  const voteAccountAddress = useMemo(() => {
    return stakeAccountMeta.stakeAccount.info.stake?.delegation.voter
  }, [stakeAccountMeta])
  
  return (
    <div className="bg-transparent w-full font-light pb-3">
      <div className="solBoxGray rounded-b-none rounded-t-lg w-full bg-white uppercase flex flex-wrap md:justify-between items-center text-center md:text-left" style={{borderBottomLeftRadius: 0, borderBottomRightRadius: 0}}>
        {/* Seed account info */}
        <div className="w-full pb-3 pt-3 md:pt-0 md:pb-0 md:w-3/12 md:pl-5 whitespace-nowrap">
          <span className="text-sm leading-6">SEED {stakeAccountMeta.seed}</span><br />
          <span className="text-lg font-bold leading-3">${stakeAccountMeta.lamports / LAMPORTS_PER_SOL} SOL</span><br />
          <span className="text-xs leading-none">$X</span>
        </div>
        <div className="w-full pb-3 md:pb-0 md:w-2/12 md:pl-5 whitespace-nowrap leading-5">
          <p>State: <span className="font-bold">{stakeActivationData?.state}</span></p>
          <p>Type: <span className="font-bold">{stakeAccountMeta.stakeAccount.type}</span></p>
        </div>
        <div className="w-full pb-6 md:pb-0 md:w-3/12 md:pl-5 whitespace-nowrap leading-5">
          {stakeAccountMeta.stakeAccount.info.stake && (
            <>
              <p>Validator:{' '}
                <a
                  href={`https://explorer.solana.com/address/${voteAccountAddress?.toBase58()}${urlSuffix}`}
                  rel="noopener noreferrer" target="_blank"
                  className="font-bold"
                >
                  {shortenAddress(voteAccountAddress?.toBase58() ?? '')}
                </a>
              </p>
              <p>Activation Epoch: <span className="font-bold">{formatEpoch(stakeAccountMeta.stakeAccount.info.stake.delegation.activationEpoch)}</span></p>
            </>
          )}
        </div>
        {/* Stake accounts - always visible */}
        <div className="w-full pb-5 md:pb-2 md:pt-2 md:w-4/12 md:pr-10 md:text-right">

          <button
            className="solBtnGray whitespace-nowrap"
            hidden={stakeActivationData?.state === "active" || stakeActivationData?.state === "deactivating"}
            onClick={() => setDelegateOpen(true)}
            disabled={!connected}
          >
            {stakeActivationData?.state === "activating" && "Re-"}Delegate
          </button>

          <button
            className="solBtnGray whitespace-nowrap"
            hidden={stakeActivationData?.state === "inactive" || stakeActivationData?.state === "deactivating"}
            onClick={async () => {
              if(!wallet?.publicKey) {
                return;
              }

              const transaction = StakeProgram.deactivate({
                stakePubkey: stakeAccountMeta.address,
                authorizedPubkey: wallet.publicKey,
              });

              await monitorTransaction(
                sendTransaction(
                  sendConnection,
                  wallet,
                  transaction.instructions,
                  []
                ),
                {
                  onSuccess: () => {},
                  onError: () => {}
                }
              );
            }} 
            disabled={!connected}
          >
            Deactivate
          </button>

          <button
            className="solBtnGray whitespace-nowrap"
            hidden={stakeActivationData?.state !== "inactive"}
            onClick={() => {
              setWithdrawOpen(true);
            }}
          >
            Withdraw
          </button>

          {wallet?.publicKey && withdrawOpen && (
            <WithdrawDialog
              wallet={wallet}
              userPublicKey={wallet.publicKey}
              stakePubkey={stakeAccountMeta.address}
              stakeAccountLamports={stakeAccountMeta.lamports}
              handleClose={() => {
                setWithdrawOpen(false);
              }}
            />
          )}
          {delegateOpen && 
            <DelegateDialog
              stakePubkey={stakeAccountMeta.address}
              open={delegateOpen}
              handleClose={() => {
                setDelegateOpen(false);
              }}
            />
          }

          {/* External button */}
          <a className="solBtnGray pb-0.5 whitespace-nowrap cursor-pointer" href={`https://explorer.solana.com/address/${stakeAccountMeta.address?.toBase58()}${urlSuffix}`} rel="noopener noreferrer" target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="truncate overflow-ellipsis pt-3" style={{direction: 'rtl'}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            {shortenAddress(stakeAccountMeta.address.toBase58())}
          </p>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full">
          <ul className="shadow-box">   
            <li className="relative">
              <button type="button"
                className="w-full solBtnRewards uppercase font-light focus:outline-none"
                onClick={() => setRewardsOpen(!rewardsOpen)}
                style={{backgroundColor: '#D5E300'}}
              >
                <div className="flex items-center justify-between">
                  <span>
                    <span className="ml-4">Rewards </span>
                    <span className="font-normal">{totalRewards / LAMPORTS_PER_SOL} SOL </span>
                    <span className="text-xs">{(APY && formatPct.format(APY)) || '-'} APY </span>
                  </span>
                  <span className="ico-plus">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </div>
              </button>
              {/* Dropdown hidden area */}
              <div className="relative transition-all duration-700">
                <Collapse in={rewardsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {stakeAccountMeta.inflationRewards.map(inflationReward => (
                      <ListItem style={{paddingLeft: 4}} key={inflationReward.epoch}>
                        <ListItemText primary={`Epoch: ${inflationReward.epoch}, reward: ${inflationReward.amount / LAMPORTS_PER_SOL} SOL`} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface WithdrawDialogProps {
  wallet: WalletAdapter;
  userPublicKey: PublicKey;
  stakePubkey: PublicKey;
  stakeAccountLamports: number;
  handleClose: () => void;
};

function WithdrawDialog({wallet, userPublicKey, stakePubkey, stakeAccountLamports, handleClose}: WithdrawDialogProps) {
  const sendConnection = useSendConnection();
  const {monitorTransaction, sending} = useMonitorTransaction();

  const [amount, setAmount] = useState('');
  const max = useMemo(() => {
    return stakeAccountLamports / LAMPORTS_PER_SOL;
  }, [stakeAccountLamports]);

  return (
    <Dialog
      open
      onClose={handleClose}
    >
      <DialogTitle>
        Withdraw from inactive stake account
      </DialogTitle>
      <DialogContent>
        <TextField
          placeholder="SOL"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  onClick={() => 
                    setAmount(max.toString())
                  }
                >
                  MAX
                </Button>
                SOL
              </InputAdornment>
            ),
            inputProps: {
              step: 0.1,
            },
          }}
          value={amount}
          onChange={e => {
            setAmount(e.target.value);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          disabled={sending}
          onClick={async () => {
            await monitorTransaction(
              sendTransaction(
                sendConnection,
                wallet,
                StakeProgram.withdraw({
                  stakePubkey,
                  authorizedPubkey: userPublicKey,
                  toPubkey: userPublicKey,
                  lamports: Number(amount) * LAMPORTS_PER_SOL,
                }).instructions,
                []
              ),
              {
                onSuccess: () => {
                  handleClose();
                },
                onError: () => {}
              }
            );
          }}
        >
          {sending ?
            <CircularProgress color="secondary" size={14} />
            : "Withdraw"
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}