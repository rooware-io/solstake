import { Box, Button, Card, CardActions, CardContent, Collapse, Link, List, ListItem, ListItemText, Typography } from "@material-ui/core";
import { ExpandLess, ExpandMore, OpenInNew, RedoOutlined } from "@material-ui/icons";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useConnection } from "../contexts/connection";
import { EpochContext } from "../contexts/epoch";
import { getFirstBlockTime, SLOT_PER_EPOCH } from "../utils/block";
import { StakeAccountMeta } from "../utils/stakeAccounts";
import { formatPct } from "../utils/utils";

const MAX_EPOCH = new BN(2).pow(new BN(64)).sub(new BN(1));

export function StakeAccountCard({stakeAccountMeta}: {stakeAccountMeta: StakeAccountMeta}) {
  const connection = useConnection();
  const [open, setOpen] = useState(false);
  const [APY, setAPY] = useState<number>();
  const { epochInfo, epochStartTime } = useContext(EpochContext);

  function formatEpoch(epoch: BN) {
    return epoch.eq(MAX_EPOCH) ? '-' : epoch.toString();
  }

  const totalRewards = useMemo(() => {
    return stakeAccountMeta.inflationRewards.reduce((sum, current) => sum + current.amount, 0)
  }, [stakeAccountMeta]);

  useEffect(() => {
    const initialStake = stakeAccountMeta.lamports - totalRewards;
    if(!stakeAccountMeta.stakeAccount.info.stake?.delegation.activationEpoch || !epochStartTime) {
      return;
    }
    const firstActivatedSlot = (stakeAccountMeta.stakeAccount.info.stake?.delegation.activationEpoch.toNumber() + 1) * SLOT_PER_EPOCH;
    getFirstBlockTime(connection, firstActivatedSlot)
      .then(activatedBlockTime => {
        if(!activatedBlockTime) {
          return;
        }
        const timePeriod = epochStartTime - activatedBlockTime;
        const apy = totalRewards / initialStake / timePeriod * 365 * 24 * 60 * 60;
        setAPY(apy);
      })
  }, [stakeAccountMeta, totalRewards, epochInfo])
  
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

          <Button onClick={() => setOpen(!open)}>
            Rewards {totalRewards / LAMPORTS_PER_SOL} SOL, {APY && formatPct.format(APY) || '-'} APY
            {open ? <ExpandLess /> : <ExpandMore />}
          </Button>
          <Collapse in={open} timeout="auto" unmountOnExit>
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
          <Link color="secondary" href={`https://explorer.solana.com/address/${stakeAccountMeta.address.toBase58()}`} rel="noopener noreferrer" target="_blank">
            <OpenInNew />
          </Link>
        </CardActions>
      </Card>
    </Box>)
}