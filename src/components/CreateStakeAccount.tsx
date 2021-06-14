import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@material-ui/core";
import { Authorized, Connection, LAMPORTS_PER_SOL, PublicKey, StakeProgram } from "@solana/web3.js";
import { useState } from "react";
import { sendTransaction } from "../contexts/connection";
import { useMonitorTransaction } from "../utils/notifications";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";

interface CreateStakeAccountProps {
  seed: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  wallet: WalletAdapter;
  connection: Connection;
  sendConnection: Connection;
};
  
export function CreateStakeAccountDialog({seed, open, setOpen, wallet, connection, sendConnection}: CreateStakeAccountProps) {
  const {monitorTransaction, sending} = useMonitorTransaction();

  const [amount, setAmount] = useState<string>('');

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
          placeholder="SOL"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          onClick={async () => {
            if(!wallet.publicKey) {
              return;
            }
            const stakePubkey = await PublicKey.createWithSeed(
              wallet.publicKey,
              seed,
              StakeProgram.programId,
            );
            const lamports = await connection.getMinimumBalanceForRentExemption(StakeProgram.space) + Number(amount) * LAMPORTS_PER_SOL;

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
                  handleClose();
                },
                onError: () => {}
              }
            );
          }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
