import { Connection, PublicKey, ValidatorInfo, VoteAccountInfo } from "@solana/web3.js";
import { createContext, useEffect, useState } from "react";
import { ValidatorScore } from "../utils/validatorsApp";
import { useConnection, useConnectionConfig } from "./connection";
import { useWallet } from "./wallet";
import { getValidatorScores } from '../utils/validatorsApp'

const CONFIG_PROGRAM_ID = new PublicKey('Config1111111111111111111111111111111111111');

async function getValidatorInfos(connection: Connection) {
  const validatorInfoAccounts = await connection.getProgramAccounts(CONFIG_PROGRAM_ID);

  console.log(validatorInfoAccounts.length);
  return validatorInfoAccounts.flatMap(validatorInfoAccount => {
    const validatorInfo = ValidatorInfo.fromConfigData(validatorInfoAccount.account.data);
    return validatorInfo ? [validatorInfo] : [];
  })
}

interface Validators {
  voteAccountInfos: VoteAccountInfo[],
  validatorInfos: ValidatorInfo[],
  validatorScores: ValidatorScore[],
  totalActivatedStake: number,
};

export const ValidatorsContext = createContext<Validators>({
  voteAccountInfos: [],
  validatorInfos: [],
  validatorScores: [],
  totalActivatedStake: 0,
});

export function ValidatorsProvider({ children = null as any }) {
  const [voteAccountInfos, setVoteAccountInfos] = useState<VoteAccountInfo[]>([]);
  const [validatorInfos, setValidatorInfos] = useState<ValidatorInfo[]>([]);
  const [validatorScores, setValidatorScores] = useState<ValidatorScore[]>([]);
  const [totalActivatedStake, setTotalActivatedStake] = useState(0);

  const connection = useConnection();
  const { cluster } = useConnectionConfig();
  const { connected } = useWallet();
  
  useEffect(() => {
    if (!connected) { return; }
    connection.getVoteAccounts()
      .then(voteAccountStatus => {
        const activatedStake = voteAccountStatus.current.concat(voteAccountStatus.delinquent).reduce((sum, current) => sum + current.activatedStake, 0);
        console.log('totalActivatedStake', activatedStake);
        setTotalActivatedStake(activatedStake);
        setVoteAccountInfos(voteAccountStatus.current ?? []);
      });
  }, [connected, connection]);
  
  useEffect(() => {
    if (!connected) { return; }
    getValidatorInfos(connection)
      .then(validatorInfos => {
        console.log(`validatorInfos.length: ${validatorInfos.length}`);
        setValidatorInfos(validatorInfos);
      });
  }, [connected, connection]);
  
  useEffect(() => {
    if (!connected) { return; }
    getValidatorScores(cluster)
      .then(setValidatorScores);
  }, [connected, cluster]);

  return (
    <ValidatorsContext.Provider
      value={{
        voteAccountInfos,
        validatorInfos,
        validatorScores,
        totalActivatedStake
      }}
    >
      {children}
    </ValidatorsContext.Provider>
  );
}