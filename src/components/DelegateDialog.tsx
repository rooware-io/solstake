import 'react-virtualized/styles.css';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import React, { useEffect, useState } from "react";
import { sendTransaction, useConnection, useConnectionConfig, useSendConnection, useSolanaExplorerUrlSuffix } from "../contexts/connection";
import { Connection, LAMPORTS_PER_SOL, PublicKey, StakeProgram, ValidatorInfo, VoteAccountInfo, VoteAccountStatus } from "@solana/web3.js";
import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Slider, TextField, Link, Box, CircularProgress } from '@material-ui/core';
import { useWallet } from '../contexts/wallet';
import { useMonitorTransaction } from '../utils/notifications';
import { formatPriceNumber, shortenAddress, sleep } from '../utils/utils';
import { Column, Table, TableHeaderProps, TableCellProps } from 'react-virtualized';
import { defaultRowRenderer } from 'react-virtualized/dist/es/Table';
import { getValidatorScores, ValidatorScore } from '../utils/validatorsApp';
import { ValidatorScoreTray } from './ValidatorScoreTray';

const CONFIG_PROGRAM_ID = new PublicKey('Config1111111111111111111111111111111111111');
const IMG_SRC_DEFAULT = 'placeholder-questionmark.png';

async function getValidatorInfos(connection: Connection) {
  const validatorInfoAccounts = await connection.getProgramAccounts(CONFIG_PROGRAM_ID);

  console.log(validatorInfoAccounts.length);
  return validatorInfoAccounts.flatMap(validatorInfoAccount => {
    const validatorInfo = ValidatorInfo.fromConfigData(validatorInfoAccount.account.data);
    return validatorInfo ? [validatorInfo] : [];
  })
}

function basicCellRenderer(props: TableCellProps) {
  return (
    <Typography>
      {props.cellData}
    </Typography>
  );
}

function basicHeaderRenderer(props: TableHeaderProps) {
  return (
    <Typography>
      {props.label}
    </Typography>
  );
}

function scoreCellRenderer(props: TableCellProps) {
  return props.cellData ? 
    <ValidatorScoreTray validatorScore={props.cellData} />
    : "N.A.";
}

interface ValidatorMeta {
  voteAccountInfo: VoteAccountInfo;
  validatorInfo: ValidatorInfo | undefined;
  validatorScore: ValidatorScore | undefined;
};

const BATCH_SIZE = 50;

export function DelegateDialog(props: {stakePubkey: PublicKey, open: boolean, handleClose: () => void}) {
  const {stakePubkey, open, handleClose} = props;

  const connection = useConnection();
  const { cluster } = useConnectionConfig();
  const sendConnection = useSendConnection();
  const {wallet} = useWallet();
  const {monitorTransaction, sending} = useMonitorTransaction();
  const urlSuffix = useSolanaExplorerUrlSuffix();
  
  const [maxComission, setMaxComission] = useState<number>(100);
  const [voteAccountStatus, setVoteAccountStatus] = useState<VoteAccountStatus>();
  const [validatorInfos, setValidatorInfos] = useState<ValidatorInfo[]>();
  const [validatorScores, setValidatorScores] = useState<ValidatorScore[]>([]);
  const [validatorMetas, setValidatorMetas] = useState<ValidatorMeta[]>([]);
  const [filteredValidatorMetas, setFilteredValidatorMetas] = useState<ValidatorMeta[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [searchCriteria, setSearchCriteria] = useState<string>('');

  useEffect(() => {
    connection.getVoteAccounts()
      .then(voteAccountStatus => {
        setVoteAccountStatus(voteAccountStatus);
      });
  }, [connection]);

  useEffect(() => {
    getValidatorInfos(connection)
      .then(validatorInfos => {
        console.log(`validatorInfos.length: ${validatorInfos.length}`);
        setValidatorInfos(validatorInfos);
      });
  }, [connection]);

  useEffect(() => {
    getValidatorScores(cluster)
      .then(setValidatorScores);
  }, [cluster]);

  // Batched validator meta building
  // Order is VoteAccountInfo[] order, until validatorScores is available
  // VoteAccountInfo with no available score go at the bottom of the list
  useEffect(() => {
    if (!voteAccountStatus?.current) {
      return;
    }
    let validatorMetas: ValidatorMeta[] = [];
    let remainingVoteAccountInfos = [...voteAccountStatus.current];

    async function batchMatch() {
      console.log('scores', validatorScores.length)
      for(let i = 0; i < (validatorScores.length ?? 0); i++) {
        const validatorScore = validatorScores[i];
        const voteAccountIndex = remainingVoteAccountInfos.findIndex(info => info.nodePubkey === validatorScore.account);
        if (voteAccountIndex < 0) {
          // If score does not match anything then it goes into the no score bucket
          continue;
        }
        const [voteAccountInfo] = remainingVoteAccountInfos.splice(voteAccountIndex, 1);
        const validatorInfo = validatorInfos?.find(validatorInfo => validatorInfo.key.equals(new PublicKey(voteAccountInfo.nodePubkey)));

        validatorMetas.push({
          voteAccountInfo,
          validatorInfo,
          validatorScore,
        });

        if (i % BATCH_SIZE === 0) {
          await sleep(1);
          console.log(`batch index: ${i}`);
          setValidatorMetas([...validatorMetas]);
        }
      }
  
      for(let i = 0; i < (remainingVoteAccountInfos.length ?? 0); i++) {
        const voteAccountInfo = remainingVoteAccountInfos[i];
        const validatorInfo = validatorInfos?.find(validatorInfo => validatorInfo.key.equals(new PublicKey(voteAccountInfo.nodePubkey)));
  
        validatorMetas.push({
          voteAccountInfo,
          validatorInfo,
          validatorScore: undefined,
        });

        if (i % BATCH_SIZE === 0) {
          await sleep(1);
          console.log(`batch index: ${i}`);
          setValidatorMetas([...validatorMetas]);
        }
      }
      setValidatorMetas([...validatorMetas]);
    }
    batchMatch();
  }, [voteAccountStatus, validatorInfos, validatorScores]);

  useEffect(() => {
    setSelectedIndex(undefined);
    setFilteredValidatorMetas(validatorMetas.filter(meta => {
      const votePubkeyMatches = searchCriteria ? meta.voteAccountInfo.votePubkey.includes(searchCriteria) : true;
      const nameMatches = searchCriteria ? meta.validatorInfo?.info.name.toLowerCase().includes(searchCriteria.toLowerCase()) : true;

      return (meta.voteAccountInfo.commission <= maxComission) && (votePubkeyMatches || nameMatches);
    }));
  }, [validatorMetas, maxComission, searchCriteria]);

  useEffect(() => {
    if(selectedIndex !== undefined && selectedIndex >= filteredValidatorMetas.length) {
      setSelectedIndex(undefined);
    }
  }, [filteredValidatorMetas, selectedIndex]);

  return (
    <Dialog
      open={open}
      fullWidth={true}
      onClose={handleClose}
      maxWidth="lg"
    >
      <DialogTitle>
        Choose a validator
      </DialogTitle>
      <DialogContent>
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
          placeholder="Name or vote account"
          value={searchCriteria}
          onChange={(e) => {
            setSearchCriteria(e.target.value);
          }}
        />

        <Box m={2} />

        <div style={{height: '60vh'}}>
          <AutoSizer>
            {({height, width}) => (
              <Table
                width={width}
                height={height}
                headerHeight={20}
                rowHeight={60}
                rowCount={filteredValidatorMetas.length}
                rowGetter={({index}) => {
                  return filteredValidatorMetas[index];
                }}
                onRowClick={({index}) => { setSelectedIndex(index) }}
                rowRenderer={props => {
                  const className = props.index === selectedIndex ? ' clickedItem': ' item';
                  return defaultRowRenderer({...props, className: props.className + className});
                }}
              >
                <Column
                  dataKey="img"
                  width={150}
                  cellDataGetter={({rowData}) => rowData.validatorInfo?.info?.keybaseUsername ?
                    `https://keybase.io/${rowData.validatorInfo?.info?.keybaseUsername}/picture`
                    : IMG_SRC_DEFAULT
                  }
                  cellRenderer={(props: TableCellProps) => {
                    return (
                      <object height="60px" data={props.cellData} type="image/png">
                        <img src={IMG_SRC_DEFAULT} alt="validator logo" />
                      </object>
                    );
                  }}
                />
                <Column
                  label="name or vote account"
                  dataKey="name"
                  width={240}
                  headerRenderer={basicHeaderRenderer}
                  cellDataGetter={({rowData}) => ({votePubkey: rowData.voteAccountInfo.votePubkey, name: rowData.validatorInfo?.info?.name || rowData.voteAccountInfo.votePubkey})}
                  cellRenderer={(props: TableCellProps) => {
                    return (
                      <div>
                        <Typography>
                          <Link color="secondary" href={`https://explorer.solana.com/address/${props.cellData.votePubkey}${urlSuffix}`} rel="noopener noreferrer" target="_blank">
                            {props.cellData.name}
                          </Link>
                        </Typography>
                      </div>
                    );
                  }}
                />
                <Column
                  label="Activated stake (SOL)"
                  dataKey="activatedStake"
                  headerRenderer={basicHeaderRenderer} cellRenderer={basicCellRenderer}
                  cellDataGetter={({rowData}) => formatPriceNumber.format(rowData.voteAccountInfo.activatedStake / LAMPORTS_PER_SOL)}
                  width={200}
                />
                <Column
                  label="Fee"
                  dataKey="commission"
                  headerRenderer={basicHeaderRenderer}
                  cellDataGetter={({rowData}) => `${rowData.voteAccountInfo.commission}`}
                  cellRenderer={basicCellRenderer}
                  width={120}
                />
                <Column
                  label="Website"
                  dataKey="website"
                  headerRenderer={basicHeaderRenderer}
                  cellDataGetter={({rowData}) => rowData.validatorInfo?.info?.website}
                  cellRenderer={(props: TableCellProps) => {
                    return (
                      <Typography>
                        <Link color="secondary" href={props.cellData} rel="noopener noreferrer" target="_blank">
                          {props.cellData}
                        </Link>
                      </Typography>
                    );
                  }}
                  width={200}
                />
                <Column
                  label="Score"
                  dataKey="validatorScore"
                  headerRenderer={() => (
                    <Typography>
                      Score (Max 11)
                      <Link href="https://validators.app/faq" rel="noopener noreferrer" target="_blank">
                        <img height="15px" src="va-logo.png" alt="" style={{verticalAlign: "middle"}}/>
                      </Link>
                    </Typography>
                  )}
                  cellDataGetter={({rowData}) => rowData.validatorScore}
                  cellRenderer={scoreCellRenderer}
                  width={200}
                />
              </Table>
            )}
          </AutoSizer>
        </div>

        <Box m={2}>
          {(selectedIndex && filteredValidatorMetas[selectedIndex]) && (
            <Typography variant="h6">
              Selected {shortenAddress(filteredValidatorMetas[selectedIndex].voteAccountInfo.votePubkey)}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          disabled={selectedIndex === undefined || sending}
          onClick={async () => {
            if(!wallet?.publicKey || selectedIndex === undefined || !filteredValidatorMetas[selectedIndex]) {
              return;
            }

            const transaction = StakeProgram.delegate({
              stakePubkey,
              authorizedPubkey: wallet.publicKey,
              votePubkey: new PublicKey(filteredValidatorMetas[selectedIndex].voteAccountInfo.votePubkey)
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
          {sending ? <CircularProgress color="secondary" size={14} /> : "Delegate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
