import 'react-virtualized/styles.css';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import List, { ListRowProps } from 'react-virtualized/dist/commonjs/List';
import React, { useEffect, useMemo, useState } from "react";
import { sendTransaction, useConnection, useSendConnection } from "../contexts/connection";
import { Connection, LAMPORTS_PER_SOL, PublicKey, StakeProgram, ValidatorInfo, VoteAccountInfo, VoteAccountStatus } from "@solana/web3.js";
import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Slider, MenuItem, TextField, Link, Grid } from '@material-ui/core';
import { useWallet } from '../contexts/wallet';
import { useMonitorTransaction } from '../utils/notifications';
import { formatPriceNumber, shortenAddress } from '../utils/utils';
import { OpenInNew } from '@material-ui/icons';

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

  function RowRenderer({
    key, // Unique key within array of rows
    index, // Index of row within collection
    isScrolling, // The List is currently being scrolled
    isVisible, // This row is visible within the List (eg it is not an overscanned row)
    style, // Style object to be applied to row (to position it)
  }: ListRowProps) {
    const voteAccount = filteredVoteAccounts && filteredVoteAccounts[index];
    const validatorInfo = voteAccount && validatorInfos?.find(validatorInfo => validatorInfo.key.equals(new PublicKey(voteAccount.nodePubkey)));

    const imgSrcDefault = 'placeholder-questionmark.png';
    const imgSrc = validatorInfo?.info?.keybaseUsername ?
      `https://keybase.io/${validatorInfo?.info?.keybaseUsername}/picture`
      : imgSrcDefault;

    if(!voteAccount) {
      return;
    }

    return (
      <MenuItem
        key={key}
        style={style}
        selected={selectedIndex === index}
        onClick={() => {
          if(selectedIndex !== undefined && selectedIndex === index) {
            setSelectedIndex(undefined);
          }
          else {
            setSelectedIndex(index);
          }
        }}
      >
        <Grid
          container
          direction="row"
          justify="space-between"
          alignItems="stretch"
        >
          <Grid item>
            <img height="60px" src={imgSrc} alt="validator logo" />
          </Grid>
          <Grid item>
            <Typography color="secondary">
              {validatorInfo?.info.name || shortenAddress(voteAccount.votePubkey)}
            </Typography>
          </Grid>
          <Grid item>
            {formatPriceNumber.format(voteAccount.activatedStake / LAMPORTS_PER_SOL) + ' SOL '}
            {voteAccount.commission + '%' + ' '}
          </Grid>
          <Grid item>
            <Link hidden={!validatorInfo?.info?.website} color="secondary" href={validatorInfo?.info.website}  rel="noopener noreferrer" target="_blank">
              <OpenInNew />
            </Link>
          </Grid>
        </Grid>
      </MenuItem>
    );
  }

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

        <Typography>
          votePubkey activatedStake comission
        </Typography>

        <div style={{height: '85%'}}>
          <AutoSizer>
            {({height, width}) => (
              <List
                width={width}
                height={height}
                rowHeight={60}
                rowCount={filteredVoteAccounts?.length ?? 0}
                rowRenderer={RowRenderer}
              />
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