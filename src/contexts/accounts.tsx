import { AccountInfo, PublicKey } from "@solana/web3.js";
import React, { useEffect, useMemo, useState } from "react";
import { useConnection } from "./connection";
import { useWallet } from "./wallet";

interface Accounts {
  systemProgramAccountInfo: AccountInfo<Buffer> | null
  manualPublicKeyString: string
  setManualPublicKeyString: (pks: string) => void
  manualPublicKey: PublicKey | undefined
};

export const AccountsContext = React.createContext<Accounts>({
  systemProgramAccountInfo: null,
  manualPublicKeyString: '',
  setManualPublicKeyString: (pks: string) => {},
  manualPublicKey: undefined,
});

export function AccountsProvider({ children = null as any }) {
  const connection = useConnection();
  const { publicKey } = useWallet();
  const [manualPublicKeyString, setManualPublicKeyString] = useState<string>('');

  const [systemProgramAccountInfo, setSystemProgramAccountInfo] = useState<AccountInfo<Buffer> | null>(null);

  const manualPublicKey = useMemo(() => {
    try {
      return new PublicKey(manualPublicKeyString);
    }
    catch {}
  }, [manualPublicKeyString]);

  const userPublicKey = useMemo(() => {
    return publicKey || manualPublicKey;
  }, [publicKey, manualPublicKey]);

  useEffect(() => {
    setSystemProgramAccountInfo(null);
    if(!userPublicKey) {
      return;
    }
    connection.getAccountInfo(userPublicKey)
      .then(accountInfo => {
        setSystemProgramAccountInfo(accountInfo);
      });
    const subscriptionId = connection.onAccountChange(userPublicKey, accountInfo => {
      setSystemProgramAccountInfo(accountInfo);
    });
    return () => { connection.removeAccountChangeListener(subscriptionId) };
  }, [connection, userPublicKey]);

  return (
    <AccountsContext.Provider
      value={{
        systemProgramAccountInfo,
        manualPublicKeyString,
        setManualPublicKeyString,
        manualPublicKey,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}
