import React from "react";
import { Button } from "@mui/material";
import { shortenAddress } from "../utils/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";

function CurrentUserBadge() {
  const { publicKey } = useWallet();

  if (!publicKey) return null;
  return (
    <>
      <Button variant="outlined" color="secondary">
        {shortenAddress(`${publicKey}`)}
      </Button>
    </>
  );
}

export function Connector() {
  const { connected, select } = useWallet();
  
  return (
    <>
      {connected ? (
        <CurrentUserBadge />
      ) : (
        <WalletMultiButton />
      )}
    </>
  );
}