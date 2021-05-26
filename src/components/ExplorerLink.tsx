import React from "react";
import { shortenAddress } from "../utils/utils";
import { PublicKey } from "@solana/web3.js";
import { Typography } from "@material-ui/core";

export function ExplorerLink(props: {
  address: string | PublicKey;
  type: string;
  code?: boolean;
  style?: React.CSSProperties;
  length?: number;
}) {
  const { type, code } = props;

  const address =
    typeof props.address === "string"
      ? props.address
      : props.address?.toBase58();

  if (!address) {
    return null;
  }

  const length = props.length ?? 9;

  return (
    <a
      href={`https://explorer.solana.com/${type}/${address}`}
      title={address}
      style={props.style}
    >
      {code ? (
        <Typography>
          {shortenAddress(address, length)}
        </Typography>
      ) : (
        shortenAddress(address, length)
      )}
    </a>
  );
}
