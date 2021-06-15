import { Box, Button, Card, CardActions, CardContent, Collapse, Link, List, ListItem, ListItemText, Tooltip, Typography } from "@material-ui/core";
import { ExpandLess, ExpandMore, OpenInNew } from "@material-ui/icons";
import { LAMPORTS_PER_SOL, StakeProgram } from "@solana/web3.js";
import BN from "bn.js";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { sendTransaction, useConnection, useSendConnection, useSolanaExplorerUrlSuffix } from "../contexts/connection";
import { EpochContext } from "../contexts/epoch";
import { useWallet } from "../contexts/wallet";
import { getFirstBlockTime, getFirstSlotInEpoch } from "../utils/block";
import { useMonitorTransaction } from "../utils/notifications";
import { StakeAccountMeta } from "../utils/stakeAccounts";
import { formatPct } from "../utils/utils";
import { DelegateDialog } from "./DelegateDialog";

const MAX_EPOCH = new BN(2).pow(new BN(64)).sub(new BN(1));

export function StakeAccountCard({stakeAccountMeta}: {stakeAccountMeta: StakeAccountMeta}) {
  const connection = useConnection();
  const sendConnection = useSendConnection();
  const {wallet, connected} = useWallet();
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [APY, setAPY] = useState<number | null>();
  const { epochSchedule, epochStartTime } = useContext(EpochContext);
  const urlSuffix = useSolanaExplorerUrlSuffix();
  const {monitorTransaction} = useMonitorTransaction();

  function formatEpoch(epoch: BN) {
    return epoch.eq(MAX_EPOCH) ? '-' : epoch.toString();
  }

  const totalRewards = useMemo(() => {
    return stakeAccountMeta.inflationRewards.reduce((sum, current) => sum + current.amount, 0)
  }, [stakeAccountMeta]);

  useEffect(() => {
    setAPY(null);
    const initialStake = stakeAccountMeta.lamports - totalRewards;
    if(!stakeAccountMeta.stakeAccount.info.stake?.delegation.activationEpoch || !epochSchedule || !epochStartTime || !totalRewards) {
      return;
    }
    const firstActivatedSlot = getFirstSlotInEpoch(
      epochSchedule,
      stakeAccountMeta.stakeAccount.info.stake?.delegation.activationEpoch.toNumber() + 1
    );

    getFirstBlockTime(connection, firstActivatedSlot)
      .then(activatedBlockTime => {
        if(!activatedBlockTime) {
          return;
        }
        const timePeriod = epochStartTime - activatedBlockTime;
        console.log(`timePeriod: ${timePeriod}, epochStartTime: ${epochStartTime}, activatedBlockTime: ${activatedBlockTime}`);
        const apy = totalRewards / initialStake / timePeriod * 365 * 24 * 60 * 60;
        setAPY(apy);
      });
  }, [connection, stakeAccountMeta, totalRewards, epochSchedule, epochStartTime])
  
  return (
    <Box m={1}>
      <Card variant="outlined">
        <CardContent>
          <Typography component="h1" gutterBottom>
            Seed: {stakeAccountMeta.seed}
          </Typography>
          <Typography variant="h6" component="h2">
            {`Balance: ${stakeAccountMeta.balance} SOL`} 
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
                hidden={stakeAccountMeta.stakeAccount.type !== 'initialized'}
              >
                <Button
                  variant="outlined"
                  onClick={() => setOpen(true)}
                  disabled={!connected}
                >
                  Delegate
                </Button>
              </div>
              <div
                hidden={stakeAccountMeta.stakeAccount.type !== 'delegated' || stakeAccountMeta.stakeAccount.info.stake?.delegation.deactivationEpoch !== undefined}
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
                  Deactivate
                </Button>
              </div>
            </>
          </Tooltip>
          {(!(stakeAccountMeta.stakeAccount.info.stake?.delegation.deactivationEpoch?.eq(MAX_EPOCH) ?? true)) && (
            <Typography>
              Deactivating...
            </Typography>
          )}
          <DelegateDialog
            stakePubkey={stakeAccountMeta.address}
            open={open}
            handleClose={() => {
              setOpen(false);
            }}
          />
        </CardActions>
      </Card>
    </Box>)
}