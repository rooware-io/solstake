import { useEffect, useState } from 'react';
import { useConnection } from '../contexts/connection';
import { DashboardEpochInfo, getDashboardEpochInfo } from '../utils/epoch';
import { formatPct, humanizeDuration } from '../utils/utils';

export default function Epoch() {
  const connection = useConnection();
  const [dashboardEpochInfo, setDashboardEpochInfo] = useState<DashboardEpochInfo | null>();

  useEffect(() => {
    setDashboardEpochInfo(null);
    async function update() {
      setDashboardEpochInfo(
        await getDashboardEpochInfo(connection)
      );
    }
    update();

    const id = setInterval(update, 30000)
    return () => clearInterval(id);
  }, [connection]);

  return (
    <div className="h-full w-full mb-3 solBoxBlue">
      <div className="p-5">
        <p className='text-3xl uppercase'>Epoch {dashboardEpochInfo?.epochInfo.epoch}</p>
      </div>
      {/* Progress bar */}
      <p className="pb-2 text-xl">{dashboardEpochInfo?.epochProgress && formatPct.format(dashboardEpochInfo.epochProgress)}</p>
      <div className="mx-5 mb-2 bg-white rounded-full">
        <div className="shadow w-full bg-grey-light">
          <div className="bg-solacid rounded-full text-xs leading-none border-4 border-white py-1 text-center text-solblue-dark" style={{width: dashboardEpochInfo?.epochProgress && formatPct.format(dashboardEpochInfo.epochProgress)}}></div>
        </div>
      </div>
      <p className="pb-3 text-xs text-solgray-light">estimated time remaining{' '}
        <span className="font-bold">
          {dashboardEpochInfo?.epochTimeRemaining && humanizeDuration.humanize(dashboardEpochInfo?.epochTimeRemaining)}
        </span>
      </p>
    </div>
  );
}
