import React, { useEffect, useState } from "react";
import { Card, CardContent, LinearProgress, Typography, TextField } from "@material-ui/core";
import { Connection, EpochInfo, PublicKey } from "@solana/web3.js";
import { humanizeDuration } from "../utils/utils";

interface SummaryCardProps {
  connection: Connection;
  connected: boolean;
  publicKey: PublicKey | null;
  setPublicKey: (publicKey: PublicKey | null) => void;
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

  const epochProgress = (100 * slotIndex) / slotsInEpoch;

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

export function SummaryCard({connection, connected, publicKey, setPublicKey} : SummaryCardProps) {
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [dashboardEpochInfo, setDashboardEpochInfo] = useState<DashboardEpochInfo | null>(null);

  useEffect(() => {
    async function update() {
      setDashboardEpochInfo(
        await getDashboardEpochInfo(connection)
      );
    }
    update();

    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [true]);

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
            {dashboardEpochInfo?.epochProgress.toFixed(2) + '%'}
          </Typography>
          <LinearProgress
            style={{height: 10, borderRadius: 5}}
            color="secondary"
            variant="determinate"
            value={dashboardEpochInfo?.epochProgress ?? 0}
          />
        </div>

        {!connected && (
          <TextField
            id="standard-basic"
            fullWidth={true}
            label="Wallet public key"
            value={publicKey?.toBase58()}
            error={errorInfo !== null}
            helperText={errorInfo}
            onChange={async function(e) {
              try {
                setErrorInfo(null);
                setPublicKey(new PublicKey(e.target.value));
              }
              catch {
                console.log(`${e.target.value} is not a valid PublicKey input`);
  
                setErrorInfo('Invalid public key');
                setPublicKey(null);
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}