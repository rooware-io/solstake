import { Connection } from "@solana/web3.js";

export const SLOT_PER_EPOCH = 432_000;

// Blows up if 10 missing slots to avoid deadlock
export async function getFirstBlockTime(connection: Connection, slot: number) {
  for(let i = 0;i<10;i++) {
    try {
      const blockTime = await connection.getBlockTime(slot);
      if (blockTime) {
        return blockTime;
      }
    }
    catch {
      continue;
    }
  }
  console.log(`Could not find a blockTime slot: ${slot}`);
  return;
}