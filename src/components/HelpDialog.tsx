import { Dialog, Box, Button, DialogActions, DialogContent, DialogTitle, Typography, Link } from "@mui/material";


export default function HelpDialog(props: {open: boolean, handleClose: () => void}) {
  const {open, handleClose} = props;

  return (
    <Dialog
    fullWidth={true}
    open={open}
    onClose={handleClose}
  >
    <DialogTitle>
      <Typography variant="h4">
        How to use solstake?
      </Typography>
    </DialogTitle>

    <DialogContent>
      <Box m={1}>
        <Typography>
          Enter you wallet public key (Stake account authority) or connect your wallet to view your stake accounts, balances, rewards and much more
        </Typography>
        <Typography>
          For in-depth staking documentation about solana staking head to <Link color="secondary" href="https://docs.solana.com/staking" target="_blank">Solana staking documentation</Link>
        </Typography>

        <Box m={2} />

        <Typography variant="h5">
          What you can do
        </Typography>
        <Typography>
          Create stake accounts, delegate to validators, unstake, check your rewards... All from any popular wallet: solflare, sollet, phantom, ledger...
        </Typography>

        <Box m={2} />
        
        <Typography>
          We'd love to hear from you - please send any feedback or suggestions to solstakeio@gmail.com
        </Typography>
      </Box>
    </DialogContent>

    <DialogActions>
      <Button onClick={handleClose} color="primary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
  );
}