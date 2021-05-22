import React from "react";
import { Button } from "@material-ui/core";
import { useWallet } from "../contexts/wallet";
import { shortenAddress } from "../utils/utils";

function CurrentUserBadge() {
  const { wallet } = useWallet();

  if (!wallet?.publicKey) {
    return null;
  }

  return (
    <>
      <Button variant="outlined" color="primary">
        {shortenAddress(`${wallet.publicKey}`)}
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
        <Button
          variant="contained"
          onClick={select}
        >
          Connect wallet
        </Button>
      )}
    </>
  );
}