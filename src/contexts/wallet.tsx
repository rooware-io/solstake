import Wallet from "@project-serum/sol-wallet-adapter";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { notify } from "./../utils/notifications";
import { useConnectionConfig } from "./connection";
import { useLocalStorageState } from "../utils/utils";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";
import { WALLET_PROVIDERS } from "../wallet-adapters/walletProviders";
import { Box, Button, Dialog, DialogActions, DialogContent } from "@material-ui/core";

const WalletContext = React.createContext<{
  wallet: WalletAdapter | undefined;
  connected: boolean;
  select: () => void;
  provider: typeof WALLET_PROVIDERS[number] | undefined; // TODO: Find something better than this we should be able to have a type of WalletAdapter here
}>({
  wallet: undefined,
  connected: false,
  select() {},
  provider: undefined,
});

export function WalletProvider({ children = null as any }) {
  const { url } = useConnectionConfig();

  const [autoConnect, setAutoConnect] = useState(false);
  const [providerUrl, setProviderUrl] = useLocalStorageState("walletProvider");

  const provider = useMemo(
    () => WALLET_PROVIDERS.find(provider => provider.url === providerUrl),
    [providerUrl]
  );

  const wallet = useMemo(() => {
      if (provider) {
        return provider.adapter ? new provider.adapter() : new Wallet(providerUrl, url);
      }
    },
    [provider, providerUrl]
  );

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (wallet) {
      wallet.on("connect", () => {
        if (wallet.publicKey) {
          setConnected(true);
          const walletPublicKey = wallet.publicKey.toBase58();
          const keyToDisplay =
            walletPublicKey.length > 20
              ? `${walletPublicKey.substring(
                  0,
                  7
                )}.....${walletPublicKey.substring(
                  walletPublicKey.length - 7,
                  walletPublicKey.length
                )}`
              : walletPublicKey;

          notify({
            message: "Wallet update",
            description: "Connected to wallet " + keyToDisplay,
          });
        }
      });

      wallet.on("disconnect", () => {
        setConnected(false);
        notify({
          message: "Wallet update",
          description: "Disconnected from wallet",
        });
      });
    }

    return () => {
      setConnected(false);
      if (wallet) {
        wallet.disconnect();
      }
    };
  }, [wallet]);

  useEffect(() => {
    if (wallet && autoConnect) {
      wallet.connect();
      setAutoConnect(false);
    }

    return () => {};
  }, [wallet, autoConnect]);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const select = useCallback(() => setIsModalVisible(true), []);
  const close = useCallback(() => setIsModalVisible(false), []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected,
        select,
        provider,
      }}
    >
      {children}
      <Dialog
        title="Select Wallet"
        open={isModalVisible}
        onClose={close}
        fullWidth={true}
      >
        <DialogContent>
          {WALLET_PROVIDERS.map((provider) => {
            const onClick = function () {
              setProviderUrl(provider.url);
              setAutoConnect(true);
              close();
            };

            return (
              <div key={provider.name}>
                <Box m={1}>
                  <Button
                    size="large"
                    onClick={onClick}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      width: "100%",
                      textAlign: "left",
                    }}
                    variant="contained"
                  >
                    <img
                      alt={`${provider.name}`}
                      width={40}
                      height={40}
                      src={provider.icon}
                      style={{ marginRight: 20 }}
                    />
                    {provider.name}
                  </Button>
                </Box>
              </div>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const { wallet, connected, provider, select } = useContext(WalletContext);
  return {
    wallet,
    connected,
    provider,
    select,
    publicKey: wallet?.publicKey,
    connect() {
      wallet ? wallet.connect() : select();
    },
    disconnect() {
      wallet?.disconnect();
    },
  };
}