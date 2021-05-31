import { Box, Button, Card, CardActions, CardContent, Collapse, Link, List, ListItem, ListItemText, Typography } from "@material-ui/core";
import { ExpandLess, ExpandMore, OpenInNew } from "@material-ui/icons";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import React, { useState } from "react";
import { StakeAccountMeta } from "../utils/stakeAccounts";

const MAX_EPOCH = new BN(2).pow(new BN(64)).sub(new BN(1));
const MAX_EPOCH_STRING = `${MAX_EPOCH}`;

export function StakeAccountCard({stakeAccountMeta}: {stakeAccountMeta: StakeAccountMeta}) {
  const [open, setOpen] = useState(false);

  function formatEpoch(epoch: BN) {
    const epochString = epoch as unknown as string;

    return epochString === MAX_EPOCH_STRING ? '-' : epochString;
  }

  console.log(stakeAccountMeta.stakeAccount.info.stake?.delegation.deactivationEpoch);
  
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
              Voter: {stakeAccountMeta.stakeAccount.info.stake.delegation.voter}
            </Typography>
          )}

          <Button onClick={() => setOpen(!open)}>
            Rewards {stakeAccountMeta.inflationRewards.reduce((sum, current) => sum + current.amount, 0) / LAMPORTS_PER_SOL} SOL
            {open ? <ExpandLess /> : <ExpandMore />}
          </Button>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {stakeAccountMeta.inflationRewards.map(inflationReward => (
              <ListItem style={{paddingLeft: 4}}>
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