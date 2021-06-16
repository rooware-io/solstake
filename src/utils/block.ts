import { Connection } from "@solana/web3.js";
import { sleep } from "./utils";

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