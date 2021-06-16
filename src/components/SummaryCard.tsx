import React, { useContext, useEffect, useMemo, useState } from "react";
import { Card, CardContent, LinearProgress, Typography, TextField, Box, Divider, Tooltip, Button, Grid } from "@material-ui/core";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { formatPct, formatPriceNumber, humanizeDuration } from "../utils/utils";
import { parsePriceData } from '@pythnetwork/client';
import { StakeAccountMeta } from "../utils/stakeAccounts";
import { DashboardEpochInfo, getDashboardEpochInfo } from "../utils/epoch";
import { AccountsContext } from "../contexts/accounts";
import { useConnection, useSendConnection } from "../contexts/connection";
import { useWallet } from "../contexts/wallet";
import { CreateStakeAccountDialog } from "./CreateStakeAccount";
import { STAKE_PROGRAM_ID } from "../utils/ids";

interface SummaryCardProps {
  publicKeyString: string | undefined;
  setPublicKeyString: (publicKeyString: string | undefined) => void;
  setPublicKey: (publicKey: PublicKey | null) => void;
  stakeAccountMetas: StakeAccountMeta[] | null;
}

async function getSOLPriceUSD(): Promise<number | undefined> {
  // TODO: Switch to mainnet when available
  const connection = new Connection(clusterApiUrl('devnet'));

  const SOLUSDPriceAccountKey = new PublicKey('BdgHsXrH1mXqhdosXavYxZgX6bGqTdj5mh2sxDhF8bJy');
  const priceAccountInfo = await connection.getAccountInfo(SOLUSDPriceAccountKey);
  if (!priceAccountInfo) {
    return;
  }
  const { price, confidence } = parsePriceData(priceAccountInfo?.data);

  console.log(`price: ${price}, confidence: ${confidence}`);
  return price;
}

export function SummaryCard(props : SummaryCardProps) {
  const connection = useConnection();
  const sendConnection = useSendConnection();
  const {wallet, connected} = useWallet();
  const {publicKeyString, setPublicKeyString, setPublicKey, stakeAccountMetas} = props;
  
  const {systemProgramAccountInfo} = useContext(AccountsContext);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [SOLPriceUSD, setSOLPriceUSD] = useState<number>();
  const [dashboardEpochInfo, setDashboardEpochInfo] = useState<DashboardEpochInfo | null>();
  const [seed, setSeed] = useState('0');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDashboardEpochInfo(null);
    async function update() {
      setDashboardEpochInfo(
        await getDashboardEpochInfo(connection)
      );
    }
    update();

    const id = setInterval(update, 30000)
    return () => clearInterval(id);
  }, [connection]);

  useEffect(() => {
    getSOLPriceUSD()
      .then(setSOLPriceUSD);
  }, []);

  useEffect(() => {
    setErrorInfo(null);
    if(!publicKeyString) {
      setPublicKey(null);
      return;
    }

    try {
      setPublicKey(new PublicKey(publicKeyString));
    }
    catch {
      console.log(`${publicKeyString} is not a valid PublicKey input`);

      setErrorInfo('Invalid public key');
      setPublicKey(null);
    }
  }, [publicKeyString, setPublicKey]);

  const totalStakedSOL = useMemo(() => {
    return stakeAccountMetas?.reduce((sum, current) => sum + current.balance, 0);
  }, [stakeAccountMetas]);

  // Yield first seed sequentially from unused seeds
  useEffect(() => {
    if(!stakeAccountMetas || !wallet?.publicKey) {
      return;
    }
    const pk = wallet.publicKey;

    let newAccountIndex = 0;
    // Hacky but should do the job in 99.9% of cases
    Promise.all(Array.from(Array(20).keys()).map(async i => {
      const seed = `${i}`;
      return PublicKey.createWithSeed(pk, seed, STAKE_PROGRAM_ID).then(pubkey => ({seed, pubkey}));
    }))
      .then(naturalStakeAccountSeedPubkeys => {
        stakeAccountMetas.forEach(meta => {
          const naturalStakeAccountSeedPubkey = naturalStakeAccountSeedPubkeys.find(({pubkey}) => meta.address.equals(pubkey));
          if(naturalStakeAccountSeedPubkey) {
            const accountIndex = parseInt(naturalStakeAccountSeedPubkey.seed);
            if(newAccountIndex <= accountIndex) {
              newAccountIndex = accountIndex + 1;
            }
          }
        });

        setSeed(newAccountIndex.toString());
      });
  }, [wallet?.publicKey, stakeAccountMetas]);

  return (
    <Card>
      <CardContent>
        <div>
          <Typography variant="h5">
            Epoch {dashboardEpochInfo?.epochInfo.epoch}
          </Typography>
          <Typography>
            ETA {dashboardEpochInfo?.epochTimeRemaining && humanizeDuration.humanize(dashboardEpochInfo?.epochTimeRemaining)}
          </Typography>
          <Typography>
            {dashboardEpochInfo?.epochProgress && formatPct.format(dashboardEpochInfo?.epochProgress)}
          </Typography>
          <LinearProgress
            style={{height: 10, borderRadius: 5}}
            color="secondary"
            variant="determinate"
            value={(dashboardEpochInfo?.epochProgress ?? 0) * 100}
          />
        </div>

        <Box m={2}></Box>

        {!connected && (
          <TextField
            id="standard-basic"
            fullWidth={true}
            label="Wallet account public key (stake authority)"
            placeholder="Public key"
            InputLabelProps={{
              shrink: true
            }}
            value={publicKeyString}
            error={errorInfo !== null}
            helperText={errorInfo}
            onChange={(e) => {
              setPublicKeyString(e.target.value);
            }}
          />
        )}
        <Divider />

        <Box m={2}></Box>

        <Grid
          container
          direction="row"
          justify="space-between"
          alignItems="center"
        >
          <Grid item xs>
            {totalStakedSOL && (
              <>
                <Typography>
                  Total staked
                </Typography>
                <Typography>
                ≈{formatPriceNumber.format(totalStakedSOL)} SOL ({SOLPriceUSD && formatPriceNumber.format(totalStakedSOL * SOLPriceUSD)} USD)
                </Typography>
              </>
            )}
            <Typography>
              SOL {SOLPriceUSD ? formatPriceNumber.format(SOLPriceUSD) : '-'} $&nbsp;
              <Tooltip title="On-chain SOL price from pyth.network oracle">
                <img style={{display: 'inline', verticalAlign: 'middle'}} height="25px" src="pyth-icon-48x48.png" alt="PythNetwork" />
              </Tooltip>
            </Typography>
          </Grid>

          <Grid item xs></Grid>

          {(wallet && systemProgramAccountInfo) && (
            <Grid item xs style={{textAlign: 'right'}}>
              <Typography>
                Account balance
              </Typography>
              <Typography>
                {systemProgramAccountInfo.lamports / LAMPORTS_PER_SOL} SOL
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setOpen(true)}
              >
                Create stake account
              </Button>
              { open &&
                <CreateStakeAccountDialog
                  seed={seed}
                  open={open}
                  setOpen={setOpen}
                  connection={connection}
                  sendConnection={sendConnection}
                  wallet={wallet}
                />
              }

            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}