import { EpochInfo } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { getFirstBlockTime, SLOT_PER_EPOCH } from "../utils/block";
import { useConnection } from "./connection";

interface EpochConfig {
  epochInfo: EpochInfo | undefined;
  epochStartTime: number | undefined
};

export const EpochContext = React.createContext<EpochConfig>({
  epochInfo: undefined,
  epochStartTime: undefined
});

export function EpochProvider({ children = undefined as any }) {
    const connection = useConnection();
    const [epochInfo, setEpochInfo] = useState<EpochInfo>();
    const [epochStartTime, setEpochStartTime] = useState<number>();

    useEffect(() => {
        connection.getEpochInfo().then(setEpochInfo);
    }, [connection]);

    useEffect(() => {
      if(!epochInfo) {
        return;
      }

      getFirstBlockTime(connection, epochInfo.epoch * SLOT_PER_EPOCH)
        .then(setEpochStartTime);
    }, [connection, epochInfo]);

    return (
        <EpochContext.Provider
          value={{
            epochInfo,
            epochStartTime
          }}
        >
          {children}
        </EpochContext.Provider>
      );
}