import { Connection, EpochSchedule } from "@solana/web3.js";
import { sleep } from "./utils";

const MINIMUM_SLOT_PER_EPOCH = 32;

// From https://github.com/solana-labs/solana/blob/18ec6756e49507c3945ab3d13d34dacbe897843b/sdk/program/src/epoch_schedule.rs#L151-L162
export function getFirstSlotInEpoch(epochSchedule: EpochSchedule, epoch: number) {
  const { firstNormalEpoch, firstNormalSlot, slotsPerEpoch } = epochSchedule;

  if(epoch <= firstNormalEpoch) {
    return (Math.pow(2, epoch) - 1) * MINIMUM_SLOT_PER_EPOCH;
  }
  else {
    return (epoch - firstNormalEpoch) * slotsPerEpoch + firstNormalSlot;
  }
}

// Returns if 10 consecutive missing slots to avoid deadlock
export async function getFirstBlockTime(connection: Connection, slot: number) {
  for(let i = 0;i<10;i++) {
    try {
      const blockTime = await connection.getBlockTime(slot + i);
      if (blockTime) {
        return blockTime;
      }
    }
    catch { } // TODO: More selective rather than catch all
    await sleep(250);
  }
  console.log(`Could not find a blockTime slot: ${slot}`);
  return;
}