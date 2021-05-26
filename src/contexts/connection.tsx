import { useLocalStorageState } from "./../utils/utils";
import {
  Account,
  Cluster,
  clusterApiUrl,
  Connection,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import React, { useContext, useEffect, useMemo } from "react";
import { notify } from "./../utils/notifications";
import { ExplorerLink } from "../components/ExplorerLink";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";

export type ExtendedCluster = Cluster | "localnet";

interface Endpoint {
    name: ExtendedCluster,
    url: string,
};

export const ENDPOINTS: Endpoint[] = [
  {
    name: "mainnet-beta",
    url: clusterApiUrl("mainnet-beta"),
  },
  {
    name: "testnet",
    url: clusterApiUrl("testnet"),
  },
  {
    name: "devnet",
    url: clusterApiUrl("devnet"),
  },
  {
    name: "localnet",
    url: "http://127.0.0.1:8899",
  },
];

const DEFAULT = ENDPOINTS[0].url;

interface ConnectionConfig {
  cluster: ExtendedCluster;
  url: string;
  setUrl: (val: string) => void;
  connection: Connection;
  sendConnection: Connection;
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  cluster: ENDPOINTS[0].name,
  url: DEFAULT,
  setUrl: () => {},
  connection: new Connection(DEFAULT, "recent"),
  sendConnection: new Connection(DEFAULT, "recent"),
});

export function ConnectionProvider({ children = undefined as any }) {
  const [url, setUrl] = useLocalStorageState(
    "connectionUrls",
    ENDPOINTS[0].url
  );

  const connection = useMemo(() => new Connection(url, "recent"), [
    url,
  ]);
  const sendConnection = useMemo(() => new Connection(url, "recent"), [
    url,
  ]);

  const endpoint =
    ENDPOINTS.find((end) => end.url === url) || ENDPOINTS[0];

  // The websocket library solana/web3.js uses closes its websocket connection when the subscription list
  // is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
  // This is a hack to prevent the list from every getting empty
  useEffect(() => {
    const id = connection.onAccountChange(new Account().publicKey, () => {});
    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [connection]);

  useEffect(() => {
    const id = connection.onSlotChange(() => null);
    return () => {
      connection.removeSlotChangeListener(id);
    };
  }, [connection]);

  useEffect(() => {
    const id = sendConnection.onAccountChange(
      new Account().publicKey,
      () => {}
    );
    return () => {
      sendConnection.removeAccountChangeListener(id);
    };
  }, [sendConnection]);

  useEffect(() => {
    const id = sendConnection.onSlotChange(() => null);
    return () => {
      sendConnection.removeSlotChangeListener(id);
    };
  }, [sendConnection]);

  return (
    <ConnectionContext.Provider
      value={{
        cluster: endpoint.name,
        url,
        setUrl,
        connection,
        sendConnection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext).connection as Connection;
}

export function useSendConnection() {
  return useContext(ConnectionContext)?.sendConnection;
}

export function useConnectionConfig() {
  const context = useContext(ConnectionContext);
  return {
    cluster: context.cluster,
    url: context.url,
    setUrl: context.setUrl,
  };
}

const getErrorForTransaction = async (connection: Connection, txid: string) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, "max");

  const tx = await connection.getParsedConfirmedTransaction(txid);

  const errors: string[] = [];
  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach((log) => {
      const regex = /Error: (.*)/gm;
      let m;
      while ((m = regex.exec(log)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        if (m.length > 1) {
          errors.push(m[1]);
        }
      }
    });
  }

  return errors;
};

export const sendTransaction = async (
  connection: Connection,
  wallet: WalletAdapter,
  instructions: TransactionInstruction[],
  signers: Account[],
  awaitConfirmation = true
) => {
  if (!wallet?.publicKey) {
    throw new Error("Wallet is not connected");
  }

  let transaction = new Transaction();
  instructions.forEach((instruction) => transaction.add(instruction));
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("max")
  ).blockhash;
  transaction.setSigners(
    // fee payied by the wallet owner
    wallet.publicKey,
    ...signers.map((s) => s.publicKey)
  );
  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  transaction = await wallet.signTransaction(transaction);
  const rawTransaction = transaction.serialize();
  let options = {
    skipPreflight: true,
    commitment: "singleGossip",
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);

  if (awaitConfirmation) {
    const status = (
      await connection.confirmTransaction(
        txid,
        options && (options.commitment as any)
      )
    ).value;

    if (status?.err) {
      const errors = await getErrorForTransaction(connection, txid);
      notify({
        message: "Transaction failed...",
        description: (
          <>
            {errors.map((err) => (
              <div>{err}</div>
            ))}
            <ExplorerLink address={txid} type="transaction" />
          </>
        ),
        type: "error",
      });

      throw new Error(
        `Raw transaction ${txid} failed (${JSON.stringify(status)})`
      );
    }
  }

  return txid;
};
