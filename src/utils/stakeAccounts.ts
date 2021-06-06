import { Connection, InflationReward, LAMPORTS_PER_SOL, PublicKey, StakeProgram } from "@solana/web3.js";
import { create } from "superstruct";
import { StakeAccount } from "../validators/accounts/accounts";
import { STAKE_PROGRAM_ID } from "./ids";

export interface StakeAccountMeta {
  address: PublicKey;
  seed: string;
  lamports: number;
  balance: number;
  stakeAccount: StakeAccount;
  inflationRewards: InflationReward[]
}

async function promiseAllInBatches<T>(tasks: (() => Promise<T>)[], batchSize: number) {
  let results: T[] = [];
  while(tasks.length > 0) {
    const currentTasks = tasks.splice(0, batchSize);
    results = results.concat(await Promise.all(currentTasks.map(task => task())));
    console.log('batch finished');
  }
  return results;
}

export async function findStakeAccountMetas(connection: Connection, walletAddress: PublicKey): Promise<StakeAccountMeta[]> {
  let newStakeAccountMetas: StakeAccountMeta[] = [];

  // Create potential solflare seed PDAs
  const solflareStakeAccountSeedPubkeys = await Promise.all(Array.from(Array(20).keys()).map(async i => {
    const seed = `stake:${i}`;
    return PublicKey.createWithSeed(walletAddress, seed, STAKE_PROGRAM_ID).then(pubkey => ({seed, pubkey}));
  }));

  const naturalStakeAccountSeedPubkeys = await Promise.all(Array.from(Array(20).keys()).map(async i => {
    const seed = `${i}`;
    return PublicKey.createWithSeed(walletAddress, seed, STAKE_PROGRAM_ID).then(pubkey => ({seed, pubkey}));
  }));

  const parsedStakeAccounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {dataSize: 200},
        {
          memcmp: {
            offset: 12,
            bytes: walletAddress.toBase58()
          }
        }
      ]
    });
  
  parsedStakeAccounts.forEach(({pubkey, account}) => {
    if (account?.data && 'parsed' in account?.data) {
      console.log(account?.data.parsed);
      const stakeAccount = create(account.data.parsed, StakeAccount);

      // We identify accounts with the solflare seed, or natural seed only for now
      const matchingSolflareSeed = solflareStakeAccountSeedPubkeys.find(element => element.pubkey.equals(pubkey))?.seed;
      const matchingNaturalSeed = naturalStakeAccountSeedPubkeys.find(element => element.pubkey.equals(pubkey))?.seed;
      const seed = matchingSolflareSeed || matchingNaturalSeed || `${pubkey.toBase58().slice(12)}...`;

      const balanceLamports = account.lamports;
      newStakeAccountMetas.push({
        address: pubkey,
        seed,
        lamports: balanceLamports,
        balance: balanceLamports / LAMPORTS_PER_SOL,
        stakeAccount,
        inflationRewards: []
      });
    }
  });

  newStakeAccountMetas.sort((a, b) => {
    if (a.seed < b.seed) {
      return -1
    }
    else if(a.seed > b.seed) {
      return 1
    }
    return 0;
  });
  
  const epochInfo = await connection.getEpochInfo();

  const delegatedActivationEpochs = newStakeAccountMetas
    .filter(meta => meta.stakeAccount.info.stake?.delegation.activationEpoch)
    .map(meta => meta.stakeAccount.info.stake?.delegation.activationEpoch?.toNumber() ?? 1000) // null coallescing not possible here

  if(delegatedActivationEpochs.length !== 0) {
    const minEpoch = Math.min(
      ...delegatedActivationEpochs
    );

    console.log(`minEpoch: ${minEpoch}`);

    let startEpoch = epochInfo.epoch - 1; // No rewards yet for the current epoch, so query from previous epoch
    const tasks: (() => Promise<(InflationReward | null)[]>)[] = [];
    for(let epoch = startEpoch;epoch > minEpoch;epoch--) {
      tasks.push(() => connection.getInflationReward(
        newStakeAccountMetas.map(accountMeta => accountMeta.address),
        epoch,
        'finalized'
      ));
    }

    const inflationRewardsResults = await promiseAllInBatches(tasks, 4);
    inflationRewardsResults.forEach(inflationRewards => inflationRewards.forEach((inflationReward, index) => {
      if (inflationReward) {
        newStakeAccountMetas[index].inflationRewards.push(inflationReward)
      }
    }));
  }

  return newStakeAccountMetas;
}