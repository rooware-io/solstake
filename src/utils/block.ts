import { Connection } from "@solana/web3.js";

export const SLOT_PER_EPOCH = 432_000;

// Blows up if 10 missing slots to avoid deadlock
export async function getFirstBlockTime(connection: Connection, block: number) {
  for(let i = 0;i<10;i++) {
    const blockTime = await connection.getBlockTime(block);
    if (blockTime) {
      return blockTime;
    }
  }
  throw new Error('Could not find a blockTime');
}