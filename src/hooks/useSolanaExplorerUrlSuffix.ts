import { clusterApiUrl } from "@solana/web3.js";
import { useConnection } from '@solana/wallet-adapter-react';

export function useSolanaExplorerUrlSuffix() {
  const { connection } = useConnection();
  // TODO: FIX
  const endpoint = '';
  if (endpoint === clusterApiUrl('devnet')) {
    return '?cluster=devnet';
  } else if (endpoint === clusterApiUrl('testnet')) {
    return '?cluster=testnet';
  }
  return '';
}