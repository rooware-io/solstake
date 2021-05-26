import { Box, Button, Card, CardActions, CardContent, Collapse, Link, List, ListItem, ListItemText, Typography } from "@material-ui/core";
import { ExpandLess, ExpandMore, OpenInNew } from "@material-ui/icons";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import React, { useState } from "react";
import { StakeAccountMeta } from "../utils/stakeAccounts";

export function StakeAccountCard({stakeAccountMeta}: {stakeAccountMeta: StakeAccountMeta}) {
  const [open, setOpen] = useState(false);
  
  return (
    <Box m={1}>
      <Card variant="outlined">
        <CardContent>
          <Typography component="h1" gutterBottom>
            {`${stakeAccountMeta.seed}`}
          </Typography>
          <Typography variant="h6" component="h2">
            {`Balance: ${stakeAccountMeta.balance} SOL`} 
          </Typography>
          <Typography color="textSecondary">
            { stakeAccountMeta.stakeAccount ? `Type: ${stakeAccountMeta.stakeAccount.type}, activation epoch: ${stakeAccountMeta.stakeAccount.info.stake?.delegation.activationEpoch}, voter: ${stakeAccountMeta.stakeAccount.info.stake?.delegation.voter}` : 'No data' }
          </Typography>

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
          <Link color="secondary" href={`https://explorer.solana.com/address/${stakeAccountMeta.address.toBase58()}`}>
            <OpenInNew />
          </Link>
        </CardActions>
      </Card>
    </Box>)
}