import { AccountInfo, Connection, InflationReward, ParsedAccountData, PublicKey, StakeProgram } from "@solana/web3.js";
import { create } from "superstruct";
import { StakeAccount } from "../validators/accounts/accounts";
import { STAKE_PROGRAM_ID } from "./ids";

export interface StakeAccountMeta {
  address: PublicKey;
  seed: string;
  lamports: number;
  stakeAccount: StakeAccount;
  inflationRewards?: InflationReward[]
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

export function accounInfoToStakeAccount(account: AccountInfo<Buffer | ParsedAccountData>): StakeAccount | undefined {
  return ('parsed' in account?.data && create(account.data.parsed, StakeAccount)) || undefined;
}

export function sortStakeAccountMetas(stakeAccountMetas: StakeAccountMeta[]) {
  stakeAccountMetas.sort((a, b) => {
    if (a.seed < b.seed) {
      return -1
    }
    else if(a.seed > b.seed) {
      return 1
    }
    return 0;
  });
}

export async function findStakeAccountMetas(connection: Connection, walletAddress: PublicKey, setStakeAccounts: (sam: StakeAccountMeta[]) => void): Promise<StakeAccountMeta[]> {
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
        {dataSize: 200}, // TODO: Trent said we might want to exclude the dataSize filter
        {
          memcmp: {
            offset: 12,
            bytes: walletAddress.toBase58()
          }
        }
      ]
    });
  
  parsedStakeAccounts.forEach(({pubkey, account}) => {
    console.log('parsed' in account?.data ? account?.data.parsed : "Does not contain parsed data");
    const stakeAccount = accounInfoToStakeAccount(account);
    if (!stakeAccount) {
      return;
    }

    // We identify accounts with the solflare seed, or natural seed only for now
    const matchingSolflareSeed = solflareStakeAccountSeedPubkeys.find(element => element.pubkey.equals(pubkey))?.seed;
    const matchingNaturalSeed = naturalStakeAccountSeedPubkeys.find(element => element.pubkey.equals(pubkey))?.seed;
    const seed = matchingSolflareSeed || matchingNaturalSeed || `${pubkey.toBase58().slice(12)}...`;

    const balanceLamports = account.lamports;
    newStakeAccountMetas.push({
      address: pubkey,
      seed,
      lamports: balanceLamports,
      stakeAccount,
    });
  });
  
  const epochInfo = await connection.getEpochInfo();

  const delegatedActivationEpochs = newStakeAccountMetas
    .filter(meta => meta.stakeAccount.info.stake?.delegation.activationEpoch)
    .map(meta => meta.stakeAccount.info.stake?.delegation.activationEpoch?.toNumber() ?? 1000) // null coallescing not possible here

  sortStakeAccountMetas(newStakeAccountMetas);
  setStakeAccounts(newStakeAccountMetas);

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
        let inflationRewards = newStakeAccountMetas[index].inflationRewards
        if (inflationRewards) {
          inflationRewards.push(inflationReward);
        }
        else {
          inflationRewards = [inflationReward];
        }
      }
    }));
  }

  return newStakeAccountMetas.map(m => Object.assign({}, m));
}