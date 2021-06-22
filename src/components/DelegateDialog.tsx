import 'react-virtualized/styles.css';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import React, { useEffect, useState } from "react";
import { sendTransaction, useConnection, useSendConnection, useSolanaExplorerUrlSuffix } from "../contexts/connection";
import { Connection, LAMPORTS_PER_SOL, PublicKey, StakeProgram, ValidatorInfo, VoteAccountInfo, VoteAccountStatus } from "@solana/web3.js";
import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Slider, TextField, Link, Box } from '@material-ui/core';
import { useWallet } from '../contexts/wallet';
import { useMonitorTransaction } from '../utils/notifications';
import { formatPriceNumber, shortenAddress } from '../utils/utils';
import { Column, Table, TableCellProps } from 'react-virtualized';

const CONFIG_PROGRAM_ID = new PublicKey('Config1111111111111111111111111111111111111');

async function getValidatorInfos(connection: Connection) {
  const validatorInfoAccounts = await connection.getProgramAccounts(CONFIG_PROGRAM_ID);

  console.log(validatorInfoAccounts.length);
  return validatorInfoAccounts.flatMap(validatorInfoAccount => {
    const validatorInfo = ValidatorInfo.fromConfigData(validatorInfoAccount.account.data);
    return validatorInfo ? [validatorInfo] : [];
  })
}

export function DelegateDialog(props: {stakePubkey: PublicKey, open: boolean, handleClose: () => void}) {
  const {stakePubkey, open, handleClose} = props;

  const connection = useConnection();
  const sendConnection = useSendConnection();
  const {wallet} = useWallet();
  const {monitorTransaction, sending} = useMonitorTransaction();
  const urlSuffix = useSolanaExplorerUrlSuffix();
  
  const [maxComission, setMaxComission] = useState<number>(100);
  const [voteAccountStatus, setVoteAccountStatus] = useState<VoteAccountStatus>();
  const [filteredVoteAccounts, setFilteredVoteAccount] = useState<VoteAccountInfo[]>();
  const [validatorInfos, setValidatorInfos] = useState<ValidatorInfo[]>();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [searchCriteria, setSearchCriteria] = useState<string>('');

  useEffect(() => {
    connection.getVoteAccounts()
      .then(voteAccountStatus => {
        setVoteAccountStatus(voteAccountStatus);
      });
  }, [connection]);

  useEffect(() => {
    setFilteredVoteAccount(voteAccountStatus?.current.filter(info => info.commission <= maxComission && (searchCriteria ? info.votePubkey.includes(searchCriteria) : true)));
  }, [voteAccountStatus, maxComission, searchCriteria]);

  useEffect(() => {
    if(selectedIndex && selectedIndex >= (filteredVoteAccounts?.length ?? 0)) {
      setSelectedIndex(undefined);
    }
  }, [filteredVoteAccounts, selectedIndex]);

  useEffect(() => {
    getValidatorInfos(connection)
      .then(validatorInfos => {
        console.log(`validatorInfos.length: ${validatorInfos.length}`);
        setValidatorInfos(validatorInfos);
      });
  }, [connection]);

  const imgSrcDefault = 'placeholder-questionmark.png';

  return (
    <Dialog
      open={open}
      fullWidth={true}
      onClose={handleClose}
      maxWidth="lg"
    >
      <DialogTitle>
        Validators
      </DialogTitle>
      <DialogContent style={{height: '80vh'}}>
        <div>
          <Typography>
            Max commission %
          </Typography>
          <Slider
            color="secondary"
            style={{width: '20%'}}
            value={maxComission}
            onChange={(event, newValue) => {setMaxComission(newValue as number)}}
            aria-labelledby="continuous-slider"
            step={1}
            valueLabelDisplay="auto"
          />
        </div>

        <TextField
          title="Search"
          placeholder="Vote account public key"
          value={searchCriteria}
          onChange={(e) => {
            setSearchCriteria(e.target.value);
          }}
        />

        <Box m={1} />

        <div style={{height: '85%'}}>
          <AutoSizer>
            {({height, width}) => (
              <Table
                width={width}
                height={height}
                headerHeight={20}
                rowHeight={60}
                rowCount={filteredVoteAccounts?.length ?? 0}
                rowGetter={({index}) => {
                  if(!filteredVoteAccounts) return;

                  const voteAccountInfo = filteredVoteAccounts[index];
                  const validatorInfo = validatorInfos?.find(validatorInfo => validatorInfo.key.equals(new PublicKey(voteAccountInfo.nodePubkey)));

                  return {
                    name: {name: validatorInfo?.info.name || shortenAddress(voteAccountInfo.votePubkey), votePubkey: voteAccountInfo.votePubkey},
                    activatedStake: formatPriceNumber.format(voteAccountInfo.activatedStake / LAMPORTS_PER_SOL),
                    commission: `${voteAccountInfo.commission}%`,
                    imgSrc: validatorInfo?.info?.keybaseUsername ?
                      `https://keybase.io/${validatorInfo?.info?.keybaseUsername}/picture`
                      : imgSrcDefault,
                    website: validatorInfo?.info?.website,
                  };
                }}
                onRowClick={({index}) => { setSelectedIndex(index) }}
              >
                <Column dataKey="imgSrc" width={150} cellRenderer={(props: TableCellProps) => {
                  
                  // TODO: Fix with placeholder when picture does not exist
                  return (
                    <object height="60px" data={props.cellData} type="image/png">
                      <img src={imgSrcDefault} alt="validator logo" />
                    </object>
                  );
                }} />
                <Column label="name or public key" dataKey="name" width={200} cellRenderer={(props: TableCellProps) => {
                    return (
                      <Link color="secondary" href={`https://explorer.solana.com/address/${props.cellData.votePubkey}${urlSuffix}`} rel="noopener noreferrer" target="_blank">
                        {props.cellData.name}
                      </Link>
                    );
                  }}
                />
                <Column label="Activated stake (SOL)" dataKey="activatedStake" width={200} />
                <Column label="Commission" dataKey="commission" width={120} />
                <Column label="Website" dataKey="website" width={200} cellRenderer={(props: TableCellProps) => {
                  return (
                    <Link color="secondary" href={props.cellData} rel="noopener noreferrer" target="_blank">
                      {props.cellData}
                    </Link>
                  );
                }} />
                <Column dataKey="APY (Coming soon)" width={120} />
              </Table>
            )}
          </AutoSizer>
        </div>

        {(filteredVoteAccounts && selectedIndex && filteredVoteAccounts[selectedIndex]) && (
          <Typography variant="h6">
            Selected votePubkey  {filteredVoteAccounts[selectedIndex].votePubkey}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          disabled={selectedIndex === undefined || sending}
          onClick={async () => {
            if(!wallet?.publicKey || !filteredVoteAccounts || selectedIndex === undefined || !filteredVoteAccounts[selectedIndex]) {
              return;
            }

            const transaction = StakeProgram.delegate({
              stakePubkey,
              authorizedPubkey: wallet.publicKey,
              votePubkey: new PublicKey(filteredVoteAccounts[selectedIndex].votePubkey)
            });

            await monitorTransaction(
              sendTransaction(
                sendConnection,
                wallet,
                transaction.instructions,
                []
              ),
              {
                onSuccess: () => {
                  handleClose();
                },
                onError: () => {}
              }
            );
          }}
        >
          Delegate
        </Button>
      </DialogActions>
    </Dialog>
  );
}