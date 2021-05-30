import { Connection, InflationReward, LAMPORTS_PER_SOL, PublicKey, StakeProgram } from "@solana/web3.js";
import { StakeAccount } from "../validators/accounts/accounts";
import { STAKE_PROGRAM_ID } from "./ids";

export interface StakeAccountMeta {
  address: PublicKey;
  seed: string;
  balance: number;
  stakeAccount: StakeAccount;
  inflationRewards: InflationReward[]
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
      const stakeAccount = account?.data.parsed as StakeAccount;

      // We identify accounts with the solflare seed, or natural seed only for now
      const matchingSolflareSeed = solflareStakeAccountSeedPubkeys.find(element => element.pubkey.equals(pubkey))?.seed;
      const matchingNaturalSeed = naturalStakeAccountSeedPubkeys.find(element => element.pubkey.equals(pubkey))?.seed;
      const seed = matchingSolflareSeed || matchingNaturalSeed || `${pubkey.toBase58().slice(12)}...`;

      const balanceLamports = parseInt(stakeAccount.info.stake?.delegation.stake as unknown as string) ?? 0;
      newStakeAccountMetas.push({
        address: pubkey,
        seed,
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

  const minEpoch = Math.min(
    ...newStakeAccountMetas.map(meta => {
      return parseInt(meta.stakeAccount?.info.stake?.delegation.activationEpoch as unknown as string ?? '1000'); // TODO: Cleaner way to get the min epoch1
    })
  );

  console.log(`minEpoch: ${minEpoch}`);
  for(let epoch = epochInfo.epoch - 1;epoch > minEpoch;epoch--) {
    const inflationRewardList = await connection.getInflationReward(
      newStakeAccountMetas.map(accountMeta => accountMeta.address),
      epoch,
      'finalized'
    );
    console.log(epoch)
    console.log(inflationRewardList);

    inflationRewardList.forEach((inflationReward, index) => {
      if (inflationReward) {
        newStakeAccountMetas[index].inflationRewards.push(inflationReward)
      }
    });
  }

  return newStakeAccountMetas;
}