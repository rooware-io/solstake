import { Connection, InflationReward, LAMPORTS_PER_SOL, PublicKey, StakeProgram } from "@solana/web3.js";
import { StakeAccount } from "../validators/accounts/accounts";
import { STAKE_PROGRAM_ID } from "./ids";

export interface StakeAccountMeta {
  address: PublicKey;
  seed: string;
  balance: number;
  stakeAccount?: StakeAccount;
  inflationRewards: InflationReward[]
}

// export async function getStakeAccounts(connection: Connection) {
//   const results = await connection.getParsedProgramAccounts(
//     StakeProgram.programId,
//     {
//       filters: [

//       ]
//     });
  
//   console.log(results);
// }


export async function findStakeAccountMetas(connection: Connection, walletAddress: PublicKey): Promise<StakeAccountMeta[]> {
  let newStakeAccountMetas: StakeAccountMeta[] = [];

  // We discover account with the solflare seed only for now
  for(let i = 0;i<8;i++) {
    const seed = `stake:${i}`;

    const stakeAccountPublicKey = await PublicKey.createWithSeed(walletAddress, seed, STAKE_PROGRAM_ID);
    console.log(stakeAccountPublicKey.toBase58());
    const accountInfo = await connection.getAccountInfo(stakeAccountPublicKey);
    const {value} = await connection.getParsedAccountInfo(stakeAccountPublicKey);

    if (value?.data && 'parsed' in value?.data) {
      console.log(value?.data.parsed);
      const stakeAccount = value?.data.parsed as StakeAccount;

      newStakeAccountMetas.push({
        address: stakeAccountPublicKey,
        seed,
        balance: accountInfo?.lamports ? accountInfo?.lamports / LAMPORTS_PER_SOL : 0,
        stakeAccount,
        inflationRewards: []
      });
    }
  }

  const epochInfo = await connection.getEpochInfo('singleGossip');

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
      'singleGossip'
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