import { Box, Button, Card, CardActions, CardContent, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Link, List, ListItem, ListItemText, TextField, Tooltip, Typography } from "@material-ui/core";
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
import { formatPct } from "../utils/utils";
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
  const [open, setOpen] = useState(false);
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
  
  return (
    <Box m={1}>
      <Card variant="outlined">
        <CardContent>
          <Typography component="h1" gutterBottom>
            Seed: {stakeAccountMeta.seed}
          </Typography>
          <Typography variant="h6" component="h2">
            {`Balance: ${stakeAccountMeta.lamports / LAMPORTS_PER_SOL} SOL`} 
          </Typography>
          <Typography color="textSecondary">
            Type: {stakeAccountMeta.stakeAccount.type}
          </Typography>
          {stakeAccountMeta.stakeAccount.info.stake && (
            <Typography color="textSecondary">
              Activation epoch: {formatEpoch(stakeAccountMeta.stakeAccount.info.stake.delegation.activationEpoch)},
              Deactivation epoch: {formatEpoch(stakeAccountMeta.stakeAccount.info.stake.delegation.deactivationEpoch)},
              Voter: {stakeAccountMeta.stakeAccount.info.stake.delegation.voter.toBase58()}
            </Typography>
          )}
          <Typography>
            State: {stakeActivationData?.state}
          </Typography>

          <Button onClick={() => setRewardsOpen(!rewardsOpen)}>
            Rewards {totalRewards / LAMPORTS_PER_SOL} SOL, {(APY && formatPct.format(APY)) || '-'} APY
            {rewardsOpen ? <ExpandLess /> : <ExpandMore />}
          </Button>
          <Collapse in={rewardsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {stakeAccountMeta.inflationRewards.map(inflationReward => (
              <ListItem style={{paddingLeft: 4}} key={inflationReward.epoch}>
                <ListItemText primary={`Epoch: ${inflationReward.epoch}, reward: ${inflationReward.amount / LAMPORTS_PER_SOL} SOL`} />
              </ListItem>
              ))}
            </List>
          </Collapse>
        </CardContent>

        <CardActions>
          <Link color="secondary" href={`https://explorer.solana.com/address/${stakeAccountMeta.address.toBase58()}${urlSuffix}`} rel="noopener noreferrer" target="_blank">
            <OpenInNew />
          </Link>
          <Tooltip
            title={connected ? "Delegate stake account to a vote account": "Connect wallet to interact with stake accounts"}
          >
            <>
              <div
                hidden={stakeActivationData?.state === "active"}
              >
                <Button
                  variant="outlined"
                  onClick={() => setOpen(true)}
                  disabled={!connected}
                >
                  {stakeActivationData?.state === "activating" && "Re-"}Delegate
                </Button>
              </div>
              <div
                hidden={stakeActivationData?.state === "inactive"}
              >
                <Button
                  variant="outlined"
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
                        onSuccess: () => {

                        },
                        onError: () => {}
                      }
                    );
                  }} 
                  disabled={!connected}
                >
                  Undelegate
                </Button>
              </div>
              <div
                hidden={stakeActivationData?.state !== "inactive"}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setWithdrawOpen(true);
                  }}
                >
                  Withdraw
                </Button>
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
              </div>
            </>
          </Tooltip>

          {open && 
            <DelegateDialog
              stakePubkey={stakeAccountMeta.address}
              open={open}
              handleClose={() => {
                setOpen(false);
              }}
            />    
          }

        </CardActions>
      </Card>
    </Box>)
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