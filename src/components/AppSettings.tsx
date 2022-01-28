import React from "react";
import { Button, MenuItem, Select } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";

export function AppSettings() {
  const { connected, disconnect } = useWallet();
  // const { url, setUrl } = useConnectionConfig();

  return (
    <>
      <Select
        // value={url}
        // onChange={e => setUrl(e.target.value as string)}
        variant="outlined"
      >
        {/* {ENDPOINTS.map(({ name, url }) => (
          <MenuItem value={url} key={url}>
            {name}
          </MenuItem>
        ))} */}
      </Select>
      {connected && (
        <Button onClick={disconnect}>
          Disconnect
        </Button>
      )}
    </>
  );
}