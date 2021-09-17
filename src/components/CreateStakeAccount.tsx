import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography } from "@material-ui/core";
import { Authorized, Connection, LAMPORTS_PER_SOL, PublicKey, StakeProgram } from "@solana/web3.js";
import { useContext, useEffect, useState } from "react";
import { AccountsContext } from "../contexts/accounts";
import { sendTransaction } from "../contexts/connection";
import { useMonitorTransaction } from "../utils/notifications";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";
import * as mathjs from "mathjs";

interface CreateStakeAccountProps {
  seed: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  wallet: WalletAdapter;
  connection: Connection;
  sendConnection: Connection;
  onSuccess: () => void;
};
  
export function CreateStakeAccountDialog({seed, open, setOpen, wallet, connection, sendConnection, onSuccess}: CreateStakeAccountProps) {
  const {monitorTransaction, sending} = useMonitorTransaction();
  const {systemProgramAccountInfo} = useContext(AccountsContext);

  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>('');

  useEffect(() => {
    if (Number(amount) > (systemProgramAccountInfo?.lamports ?? 0) / LAMPORTS_PER_SOL) {
      setError('Insufficient SOL balance');
    }
    else {
      setError(null);
    }
  }, [systemProgramAccountInfo, amount]);

  function handleClose() {
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
    >
      <DialogTitle>
        Create stake account
      </DialogTitle>
      <DialogContent>
        <Typography>
          Seed: {seed}
        </Typography>
        <TextField
          type="number"
          value={amount}
          onChange={e => {
            setAmount(e.target.value);
          }}
          placeholder="0"
          error={error !== null}
          helperText={error}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                SOL
              </InputAdornment>
            ),
            inputProps: {
              step: 0.1,
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          disabled={sending || Number(amount) === 0 || !!error}
          onClick={async () => {
            if(!wallet.publicKey) {
              return;
            }
            const stakePubkey = await PublicKey.createWithSeed(
              wallet.publicKey,
              seed,
              StakeProgram.programId,
            );
            const lamports = mathjs.bignumber(amount)
              .mul(LAMPORTS_PER_SOL)
              .toNumber();

            const transaction = StakeProgram.createAccountWithSeed({
              fromPubkey: wallet.publicKey,
              stakePubkey,
              basePubkey: wallet.publicKey,
              seed,
              authorized: new Authorized(
                wallet.publicKey,
                wallet.publicKey
              ),
              lamports
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
                  onSuccess();
                  handleClose();
                },
                onError: () => {}
              }
            );
          }}
        >
          {sending ? <CircularProgress color="secondary" size={14} /> : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
