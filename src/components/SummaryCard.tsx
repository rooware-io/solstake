import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, LinearProgress, Typography, TextField, Box, Divider, Tooltip } from "@material-ui/core";
import { clusterApiUrl, Connection, EpochInfo, PublicKey } from "@solana/web3.js";
import { formatPct, formatPriceNumber, humanizeDuration } from "../utils/utils";
import { parseMappingData, parsePriceData, parseProductData } from '@pythnetwork/client';
import { StakeAccountMeta } from "../utils/stakeAccounts";

interface SummaryCardProps {
  connection: Connection;
  connected: boolean;
  publicKeyString: string | undefined;
  setPublicKeyString: (publicKeyString: string | undefined) => void;
  setPublicKey: (publicKey: PublicKey | null) => void;
  stakeAccountMetas: StakeAccountMeta[] | null;
}

interface DashboardEpochInfo {
  epochInfo: EpochInfo;
  epochProgress: number;
  epochTimeRemaining: number;
}

async function getDashboardEpochInfo(connection: Connection) : Promise<DashboardEpochInfo> {
  // Inspired from explorer.solana.com DashboardInfo
  const epochInfo = await connection.getEpochInfo();
  const {slotIndex, slotsInEpoch} =  epochInfo;

  const epochProgress = slotIndex / slotsInEpoch;

  //const samples = await connection.getRecentPerformanceSamples(360);
  const samples = [{samplePeriodSecs: 689, numSlots: 1000}] // Hardcoded until mystery above is solved
  const timePerSlotSamples = samples
    .filter((sample) => {
      return sample.numSlots !== 0;
    })
    .slice(0, 60)
    .map((sample) => {
      return sample.samplePeriodSecs / sample.numSlots;
    })

  const samplesInHour = timePerSlotSamples.length < 60 ? timePerSlotSamples.length : 60;
  const avgSlotTime_1h =
    timePerSlotSamples.reduce((sum: number, cur: number) => {
      return sum + cur;
    }, 0) / samplesInHour;

  const hourlySlotTime = Math.round(1000 * avgSlotTime_1h);
  const epochTimeRemaining = (slotsInEpoch - slotIndex) * hourlySlotTime;

  console.log(`epochProgress: ${epochProgress}, epochTimeRemaining: ${epochTimeRemaining}`);
  return {
    epochInfo,
    epochProgress,
    epochTimeRemaining,
  };
}

async function getSOLPriceUSD(): Promise<number | undefined> {
  // TODO: Switch to mainnet when available
  const connection = new Connection(clusterApiUrl('devnet'));

  /*
    Where do we get this key? Do we really have to traverse everytime?
    const publicKey = new PublicKey(ORACLE_MAPPING_PUBLIC_KEY);
    const mappingAccountInfo = await connection.getAccountInfo(publicKey);
    const { productAccountKeys } = parseMappingData(mappingAccountInfo?.data);
    const productAccountInfo = await connection.getAccountInfo(productAccountKeys[productAccountKeys.length - 1]);
    const { product, priceAccountKey } = parseProductData(productAccountInfo?.data);
  */
  
  const SOLUSDPriceAccountKey = new PublicKey('BdgHsXrH1mXqhdosXavYxZgX6bGqTdj5mh2sxDhF8bJy');
  const priceAccountInfo = await connection.getAccountInfo(SOLUSDPriceAccountKey);
  if (!priceAccountInfo) {
    return;
  }
  const { price, confidence } = parsePriceData(priceAccountInfo?.data);
  //console.log(`${product.symbol}: $${price} \xB1$${confidence}`);
  console.log(`price: ${price}, confidence: ${confidence}`);
  return price;
}

export function SummaryCard(props : SummaryCardProps) {
  const {connection, connected, publicKeyString, setPublicKeyString, setPublicKey, stakeAccountMetas} = props;

  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [SOLPriceUSD, setSOLPriceUSD] = useState<number>();
  const [dashboardEpochInfo, setDashboardEpochInfo] = useState<DashboardEpochInfo | null>();

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
  }, [true]);

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
  }, [publicKeyString]);

  const totalStakedSOL = useMemo(() => {
    return stakeAccountMetas?.reduce((sum, current) => sum + current.balance, 0);
  }, [stakeAccountMetas]);

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

        <div>
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
              <img style={{display: 'inline', verticalAlign: 'middle'}} height="25px" src="pyth-icon-48x48.png" />
            </Tooltip>
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}