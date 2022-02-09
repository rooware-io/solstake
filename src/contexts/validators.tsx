import { Connection, PublicKey, ValidatorInfo, VoteAccountInfo } from "@solana/web3.js";
import { createContext, useEffect, useState } from "react";
import { ValidatorScore } from "../utils/validatorsApp";
import { getValidatorScores } from '../utils/validatorsApp'
import { getStakeviewApys, ValidatorApy } from "../utils/stakeviewApp";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

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
  validatorApys: ValidatorApy[],
  totalActivatedStake: number,
};

export const ValidatorsContext = createContext<Validators>({
  voteAccountInfos: [],
  validatorInfos: [],
  validatorScores: [],
  validatorApys: [],
  totalActivatedStake: 0,
});

export function ValidatorsProvider({ children = null as any }) {
  const [voteAccountInfos, setVoteAccountInfos] = useState<VoteAccountInfo[]>([]);
  const [validatorInfos, setValidatorInfos] = useState<ValidatorInfo[]>([]);
  const [validatorScores, setValidatorScores] = useState<ValidatorScore[]>([]);
  const [validatorApys, setValidatorApys] = useState<ValidatorApy[]>([]);
  const [totalActivatedStake, setTotalActivatedStake] = useState(0);

  const { connection } = useConnection();
  const cluster = 'mainnet-beta'; // useConnectionConfig();
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
  }, [connection, connected]);
  
  useEffect(() => {
    if (!connected) { return; }
    getValidatorInfos(connection)
      .then(validatorInfos => {
        console.log(`validatorInfos.length: ${validatorInfos.length}`);
        setValidatorInfos(validatorInfos);
      });
  }, [connection, connected]);
  
  useEffect(() => {
    if (!connected) { return; }
    getValidatorScores(cluster)
      .then(setValidatorScores);
  }, [connected, cluster]);

  useEffect(() => {
    if (cluster !== 'mainnet-beta') {
      setValidatorApys([]);
      return;
    }
    getStakeviewApys()
      .then(setValidatorApys);
  }, [cluster])

  return (
    <ValidatorsContext.Provider
      value={{
        voteAccountInfos,
        validatorInfos,
        validatorScores,
        validatorApys,
        totalActivatedStake
      }}
    >
      {children}
    </ValidatorsContext.Provider>
  );
}