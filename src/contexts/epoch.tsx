import { EpochInfo, EpochSchedule } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { getFirstBlockTime, getFirstSlotInEpoch } from "../utils/block";
import { useConnection } from "./connection";

interface EpochConfig {
  epochInfo: EpochInfo | undefined;
  epochSchedule: EpochSchedule | undefined;
  epochStartTime: number | undefined;
};

export const EpochContext = React.createContext<EpochConfig>({
  epochInfo: undefined,
  epochSchedule: undefined,
  epochStartTime: undefined
});

export function EpochProvider({ children = undefined as any }) {
  const connection = useConnection();
  const [epochInfo, setEpochInfo] = useState<EpochInfo>();
  const [epochSchedule, setEpochSchedule] = useState<EpochSchedule>();
  const [epochStartTime, setEpochStartTime] = useState<number>();

  useEffect(() => {
      setEpochInfo(undefined);
      connection.getEpochInfo().then(setEpochInfo);
  }, [connection]);

  useEffect(() => {
    setEpochSchedule(undefined);
    connection.getEpochSchedule()
      .then(setEpochSchedule);
  }, [connection]);

  useEffect(() => {
    if(!epochInfo || !epochSchedule) {
      setEpochStartTime(undefined);
      return;
    }

    const slot = getFirstSlotInEpoch(epochSchedule, epochInfo.epoch);
    getFirstBlockTime(connection, slot)
      .then(setEpochStartTime);
  }, [connection, epochInfo]);

  return (
    <EpochContext.Provider
      value={{
        epochInfo,
        epochSchedule,
        epochStartTime
      }}
    >
      {children}
    </EpochContext.Provider>
  );
}