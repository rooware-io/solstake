# Solstake with CLI

Solstake uses your wallet address along with the standard seed (a number incrementing) as seed to find the program derived address of each stake account

As a result, you can explore and interact with stake accounts in solstake and in the CLI effortlessly.

Let's assume we have a wallet (system program account) and we have its keypair in the CLI. solstake-test-keypair.json

Two essential documentation pages from solana-labs:

- https://docs.solana.com/cli/delegate-stake act on a specified stake account through its authorities
- https://docs.solana.com/cli/manage-stake-accounts find stake accounts and read data

Show the 10 first stake accounts associated to the the keypair

`solana-stake-accounts addresses solstake-test-keypair.json --num-accounts 10`

Show the sum of all balances for those 10 accounts

`solana-stake-accounts balance solstake-test-keypair.json --num-accounts 10`

Create a stake account with seed 5, keypair as stake and withdraw authority

`solana create-stake-account solstake-test-keypair.json 10 --seed 5 --keypair solstake-test-keypair.json`