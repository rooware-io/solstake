import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { StakeAccount } from "../validators/accounts/accounts";
import { STAKE_PROGRAM_ID } from "./ids";

export interface StakeAccountMeta {
    address: PublicKey;
    seed: string;
    balance: number;
    stakeAccount?: StakeAccount;
}

export async function findStakeAccountMetas(connection: Connection, walletAddress: PublicKey): Promise<StakeAccountMeta[]> {
    let newStakeAccountMetas: StakeAccountMeta[] = [];

    // We discover account with the solfalre seed only for now
    for(let i = 0;i<8;i++) {
      const seed = `stake:${i}`;

      const stakeAccountPublicKey = await PublicKey.createWithSeed(walletAddress, seed, STAKE_PROGRAM_ID);
      console.log(stakeAccountPublicKey.toBase58());
      const accountInfo = await connection.getAccountInfo(stakeAccountPublicKey);
      const {context, value} = await connection.getParsedAccountInfo(stakeAccountPublicKey);

      if (value?.data && 'parsed' in value?.data) {
        console.log(value?.data.parsed);
        const stakeAccount = value?.data.parsed as StakeAccount;

        newStakeAccountMetas.push({
          address: stakeAccountPublicKey,
          seed,
          balance: accountInfo?.lamports ? accountInfo?.lamports / LAMPORTS_PER_SOL : 0,
          stakeAccount
        });
      }
    }

    return newStakeAccountMetas;
}