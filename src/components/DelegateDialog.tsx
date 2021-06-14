import 'react-virtualized/styles.css';

// You can import any component you want as a named export from 'react-virtualized', eg
//import {Column, Table} from 'react-virtualized';

// But if you only use a few react-virtualized components,
// And you're concerned about increasing your application's bundle size,
// You can directly import only the components you need, like so:
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import List from 'react-virtualized/dist/commonjs/List';
import React, { useEffect, useState } from "react";
import { useConnection } from "../contexts/connection";
import { LAMPORTS_PER_SOL, VoteAccountInfo } from "@solana/web3.js";
import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Box, Slider } from '@material-ui/core';

export function DelegateDialog() {
  const connection = useConnection();
  const [open, setOpen] = useState(true);
  const [maxComission, setMaxComission] = useState<number>(100);
  const [voteAccounts, setVoteAccounts] = useState<VoteAccountInfo[]>();
  const [filteredVoteAccounts, setFilteredVoteAccount] = useState<VoteAccountInfo[]>();

  useEffect(() => {
    // For now hide stake lower than 1000 SOL, also ignore delinquents
    connection.getVoteAccounts()
      .then(voteAccountStatus => {
        setVoteAccounts(voteAccountStatus.current);
      });
  }, [connection]);

  useEffect(() => {
    setFilteredVoteAccount(voteAccounts?.filter(info => info.commission <= maxComission));
  }, [voteAccounts, maxComission]);

  function handleClose() {
    setOpen(false);
  }

  function rowRenderer({
    key, // Unique key within array of rows
    index, // Index of row within collection
    isScrolling, // The List is currently being scrolled
    isVisible, // This row is visible within the List (eg it is not an overscanned row)
    style, // Style object to be applied to row (to position it)
  }: {key: string, index: number, isScrolling: boolean, isVisible: boolean, style: React.CSSProperties}) {
    return (
      <div key={key} style={style}>       
        <Typography>
          {filteredVoteAccounts && (filteredVoteAccounts[index].votePubkey + ' ' + filteredVoteAccounts[index].activatedStake / LAMPORTS_PER_SOL + ' ' + filteredVoteAccounts[index].commission + '%')}
        </Typography>
      </div>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button disabled>Select</Button>
      </DialogActions>
    </Dialog>
  );
}