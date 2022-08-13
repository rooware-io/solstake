import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import * as AllWalletAdapters from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo } from 'react';
import { useSnackbar } from 'notistack';

// Hardcoded ordering of the top wallets
const TOP_WALLETS = [
  'Phantom',
  'Solflare',
  'Glow',
  'Sollet',
  'Sollet (Extension)',
  'Ledger',
  'Solflare (Web)',
];

export const Wallet: FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded.
  const wallets = useMemo(() => {
    const walletAdapters = Object.values(AllWalletAdapters)
      .filter(
        (item) =>
          typeof item === 'function' && item.name && item.prototype.connect
      ) // find any callable class (adapter)
      .map((WalletAdapter: any) => new WalletAdapter()); // Intentional any, TS were being annoying

    const filteredWallets = walletAdapters.filter(
      (item) => item.name && item.icon
    );
    filteredWallets.sort((a, b) => {
      const indexOfA = TOP_WALLETS.indexOf(a.name);
      const indexOfB = TOP_WALLETS.indexOf(b.name);

      return (
        (indexOfA === -1 ? 100 : indexOfA) - (indexOfB === -1 ? 100 : indexOfB)
      );
    });
    return filteredWallets;
  }, [network]);

  const { enqueueSnackbar } = useSnackbar();
  const onError = useCallback(
    (error: WalletError) => {
      enqueueSnackbar(
        error.message ? `${error.name}: ${error.message}` : error.name,
        { variant: 'error' }
      );
      console.error(error);
    },
    [enqueueSnackbar]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletDialogProvider>{children}</WalletDialogProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default Wallet;
