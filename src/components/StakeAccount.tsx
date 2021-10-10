import { Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, List, ListItem, ListItemText, TextField, Tooltip } from "@material-ui/core";
//import { ExpandLess, ExpandMore, OpenInNew } from "@material-ui/icons";
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
import { CopyToClipboard } from "react-copy-to-clipboard";
import { DelegateDialog } from "./DelegateDialog";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";
import * as mathjs from "mathjs";

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

  const [isCopied, setIsCopied] = useState(false);

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

  const APR = useMemo(() => {
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
      <div className="solBoxGray dark:bg-solblue-dark rounded-b-none rounded-t-lg w-full bg-white uppercase flex flex-wrap md:justify-between items-center text-center md:text-left" style={{borderBottomLeftRadius: 0, borderBottomRightRadius: 0}}>
        {/* Seed account info */}
        <div className="w-full pb-3 pt-3 md:pt-0 md:pb-0 md:w-3/12 md:pl-5 whitespace-nowrap">
          <span className="text-sm leading-6">SEED {stakeAccountMeta.seed} </span> 
          
          {/* <Tooltip title={'Split'}>
            <button className="text-solblue-2" style={{direction: 'rtl'}}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pl-1 mb-0.5 inline-block" stroke="none" viewBox="0 0 24 24" fill="currentColor"><path d="M 6 2.5859375 L 1.2929688 7.2929688 L 2.7070312 8.7070312 L 5 6.4140625 L 5 12 C 5 13.64497 6.3550302 15 8 15 L 10 15 C 10.56503 15 11 15.43497 11 16 L 11 22 L 13 22 L 13 16 C 13 15.43497 13.43497 15 14 15 L 16 15 C 17.64497 15 19 13.64497 19 12 L 19 6.4140625 L 21.292969 8.7070312 L 22.707031 7.2929688 L 18 2.5859375 L 13.292969 7.2929688 L 14.707031 8.7070312 L 17 6.4140625 L 17 12 C 17 12.56503 16.56503 13 16 13 L 14 13 C 13.231416 13 12.533353 13.304125 12 13.787109 C 11.466647 13.304125 10.768584 13 10 13 L 8 13 C 7.4349698 13 7 12.56503 7 12 L 7 6.4140625 L 9.2929688 8.7070312 L 10.707031 7.2929688 L 6 2.5859375 z"></path></svg>
            </button>
          </Tooltip>
          <Tooltip title={'Merge'}>
            <button className="text-solblue-2" style={{direction: 'rtl'}}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pl-1 mb-0.5 inline-block" stroke="none" viewBox="0 0 24 24" fill="currentColor"><path d="M 12 2.5859375 L 6.2929688 8.2929688 L 7.7070312 9.7070312 L 11 6.4140625 L 11 14 C 11 16.773666 8.7736661 19 6 19 L 2 19 L 2 21 L 6 21 C 8.5453672 21 10.774629 19.62391 12 17.582031 C 13.225371 19.62391 15.454633 21 18 21 L 22 21 L 22 19 L 18 19 C 15.226334 19 13 16.773666 13 14 L 13 6.4140625 L 16.292969 9.7070312 L 17.707031 8.2929688 L 12 2.5859375 z"></path></svg>  
            </button>
          </Tooltip> */}
          <br />
          
          <span className="text-lg font-bold leading-3">{stakeAccountMeta.lamports / LAMPORTS_PER_SOL} SOL</span><br />
          {/* <span className="text-xs leading-none">$X</span> */}
        </div>
        <div className="w-full pb-3 md:pb-0 md:w-2/12 md:pl-5 whitespace-nowrap leading-5">
          <p>State: <span className="font-bold">{stakeActivationData?.state}</span></p>
          <p>Type: <span className="font-bold">{stakeAccountMeta.stakeAccount.type}</span></p>
        </div>
        <div className="w-full m-2 pb-6 md:pb-0 md:w-3/12 md:pl-5 whitespace-nowrap leading-5">
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
              <p>Deactivation Epoch: <span className="font-bold">{formatEpoch(stakeAccountMeta.stakeAccount.info.stake.delegation.deactivationEpoch)}</span></p>
            </>
          )}
        </div>
        {/* Stake accounts - always visible */}
        <div className="w-full pb-5 md:pb-2 md:pt-2 md:w-3/12 md:pr-10 md:text-right">
          {connected &&
            <>
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
            </>
          }

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

          <CopyToClipboard text={stakeAccountMeta.address.toBase58()}
              onCopy={() => {
                setIsCopied(true)
                setTimeout(() => {
                  setIsCopied(false)
                }, 1000)
              }}
            >
            <Tooltip
              title={isCopied
                ? 'Copied'
                : 'Copy to clipboard'
              }
            >
              <button className="m-2 font-mono" style={{direction: 'rtl'}}>
                <p>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>&emsp;
                  {shortenAddress(stakeAccountMeta.address.toBase58())}
                </p>
              </button>
            </Tooltip>
          </CopyToClipboard>

          {/* External button */}
          <a className="pb-0.5 whitespace-nowrap cursor-pointer" href={`https://explorer.solana.com/address/${stakeAccountMeta.address?.toBase58()}${urlSuffix}`} rel="noopener noreferrer" target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Dropdown button */}
      <div className="w-full">
        <div className="w-full">
          <ul className="shadow-box">   
            <li className="relative">
              <button
                type="button"
                className="w-full solBtnRewards uppercase font-light focus:outline-none"
                onClick={() => setRewardsOpen(!rewardsOpen)}
                style={{backgroundColor: '#D5E300'}}
              >
                <div className="flex items-center justify-between">
                  <span>
                    <span className="ml-4">Rewards </span>
                    <span className="font-normal">{totalRewards / LAMPORTS_PER_SOL} SOL </span>
                    <span className="text-xs">{(APR && formatPct.format(APR)) || '-'} APR </span>
                  </span>
                  <span className="ico-plus" hidden={stakeAccountMeta.inflationRewards.length === 0}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </div>
              </button>
              {/* Dropdown hidden area */}
              <div className="relative transition-all duration-700 text-solblue-dark dark:text-solblue">
                <Collapse in={rewardsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem className="justify-items text-solacid border-b border-solacid" style={{padding: 1, paddingLeft: 20, paddingRight: 20, paddingTop: 15}}>
                        <ListItemText className="w-1/3" primary={`Epoch`} />
                        <ListItemText className="w-1/3" primary={`Reward`} />
                        <ListItemText className="w-1/3" primary={`Post Balance`} />
                    </ListItem>
                    {stakeAccountMeta.inflationRewards.map(inflationReward => (
                      <ListItem className="justify-items border-b border-solblue-2 dark:border-solblue-darker" style={{padding: 1, paddingLeft: 20, paddingRight: 20}} key={inflationReward.epoch}>
                        <ListItemText className="w-1/3" primary={`${inflationReward.epoch}`} />
                        <ListItemText className="w-1/3" primary={`${inflationReward.amount / LAMPORTS_PER_SOL} SOL`} />
                        <ListItemText className="w-1/3" primary={`${inflationReward.postBalance / LAMPORTS_PER_SOL}`} />
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
    return mathjs.bignumber(stakeAccountLamports)
      .div(LAMPORTS_PER_SOL)
      .toString();
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
                    setAmount(max)
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
                  lamports: mathjs.bignumber(amount)
                    .mul(LAMPORTS_PER_SOL)
                    .toNumber(),
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