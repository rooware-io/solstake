import React from "react";
import { Button, MenuItem, Select } from "@material-ui/core";
import { ENDPOINTS, useConnectionConfig } from "../contexts/connection";
import { useWallet } from "../contexts/wallet";

export function AppSettings() {
  const { connected, disconnect } = useWallet();
  const { url, setUrl } = useConnectionConfig();

  return (
    <>
      <Select
        value={url}
        onChange={e => setUrl(e.target.value as string)}
        variant="outlined"
      >
        {ENDPOINTS.map(({ name, url }) => (
          <MenuItem value={url} key={url}>
            {name}
          </MenuItem>
        ))}
      </Select>
      {connected && (
        <Button onClick={disconnect}>
          Disconnect
        </Button>
      )}
    </>
  );
}