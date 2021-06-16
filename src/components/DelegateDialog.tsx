import 'react-virtualized/styles.css';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import List, { ListRowProps } from 'react-virtualized/dist/commonjs/List';
import React, { useEffect, useState } from "react";
import { sendTransaction, useConnection, useSendConnection } from "../contexts/connection";
import { LAMPORTS_PER_SOL, PublicKey, StakeProgram, VoteAccountInfo, VoteAccountStatus } from "@solana/web3.js";
import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Slider, MenuItem } from '@material-ui/core';
import { useWallet } from '../contexts/wallet';
import { useMonitorTransaction } from '../utils/notifications';

export function DelegateDialog(props: {stakePubkey: PublicKey, open: boolean, handleClose: () => void}) {
  const {stakePubkey, open, handleClose} = props;

  const connection = useConnection();
  const sendConnection = useSendConnection();
  const {wallet} = useWallet();
  const {monitorTransaction, sending} = useMonitorTransaction();
  
  const [maxComission, setMaxComission] = useState<number>(100);
  const [voteAccountStatus, setVoteAccountStatus] = useState<VoteAccountStatus>();
  const [filteredVoteAccounts, setFilteredVoteAccount] = useState<VoteAccountInfo[]>();
  const [selectedIndex, setSelectedIndex] = useState<number>();


  useEffect(() => {
    connection.getVoteAccounts()
      .then(voteAccountStatus => {
        setVoteAccountStatus(voteAccountStatus);
      });
  }, [connection]);

  useEffect(() => {
    setFilteredVoteAccount(voteAccountStatus?.current.filter(info => info.commission <= maxComission));
  }, [voteAccountStatus, maxComission]);

  useEffect(() => {
    if(selectedIndex && selectedIndex >= (filteredVoteAccounts?.length ?? 0)) {
      setSelectedIndex(undefined);
    }
  }, [filteredVoteAccounts, selectedIndex]);

  function rowRenderer({
    key, // Unique key within array of rows
    index, // Index of row within collection
    isScrolling, // The List is currently being scrolled
    isVisible, // This row is visible within the List (eg it is not an overscanned row)
    style, // Style object to be applied to row (to position it)
  }: ListRowProps) {
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
        <Typography>
          {filteredVoteAccounts && (filteredVoteAccounts[index].votePubkey + ' ' + filteredVoteAccounts[index].activatedStake / LAMPORTS_PER_SOL + ' ' + filteredVoteAccounts[index].commission + '%')}
        </Typography>
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
        <Typography>
          votePubkey activatedStake comission
        </Typography>

        <div style={{height: '90%'}}>
          <AutoSizer>
            {({height, width}) => (
              <List
                width={width}
                height={height}
                rowHeight={50}
                rowCount={filteredVoteAccounts?.length ?? 0}
                rowRenderer={rowRenderer}
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