import { AccountInfo } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { useConnection } from "./connection";
import { useWallet } from "./wallet";

export interface Accounts {
  systemProgramAccountInfo: AccountInfo<Buffer> | null
};

export const AccountsContext = React.createContext<Accounts>({systemProgramAccountInfo: null});

export function AccountsProvider({ children = null as any }) {
  const connection = useConnection();
  const { publicKey } = useWallet();

  const [systemProgramAccountInfo, setSystemProgramAccountInfo] = useState<AccountInfo<Buffer> | null>(null);

  useEffect(() => {
    if(!publicKey) {
      setSystemProgramAccountInfo(null);
      return;
    }
    connection.getAccountInfo(publicKey)
      .then(accountInfo => {
        setSystemProgramAccountInfo(accountInfo);
      });
  }, [connection, publicKey]);

  return (
    <AccountsContext.Provider
      value={{
        systemProgramAccountInfo,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}
