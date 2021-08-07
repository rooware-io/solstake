import { Connection, EpochInfo } from "@solana/web3.js";

export interface DashboardEpochInfo {
  epochInfo: EpochInfo;
  epochProgress: number;
  epochTimeRemaining: number;
}

export async function getDashboardEpochInfo(connection: Connection) : Promise<DashboardEpochInfo> {
  // Inspired from explorer.solana.com DashboardInfo
  const epochInfo = await connection.getEpochInfo();
  const {slotIndex, slotsInEpoch} =  epochInfo;

  const epochProgress = slotIndex / slotsInEpoch;

  //const samples = await connection.getRecentPerformanceSamples(360);
  const samples = [{samplePeriodSecs: 550, numSlots: 1000}] // Hardcoded until mystery above is solved
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