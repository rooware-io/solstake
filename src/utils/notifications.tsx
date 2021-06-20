import { Button } from '@material-ui/core';
import { Connection } from '@solana/web3.js';
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { useConnection, useSolanaExplorerUrlSuffix } from '../contexts/connection';

async function confirmTransaction(
  connection: Connection,
  signature: string,
) {
  let startTime = new Date();
  let result = await connection.confirmTransaction(signature, 'confirmed');
  if (result.value.err) {
    throw new Error(
      'Error confirming transaction: ' + JSON.stringify(result.value.err),
    );
  }
  console.log(
    'Transaction confirmed after %sms',
    new Date().getTime() - startTime.getTime(),
  );
  return result.value;
}

export function notify({message, description}: {message: string, description: string}) {
  console.log(`${message}, ${description}`);
} 

export function useMonitorTransaction() {
  const connection = useConnection();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [sending, setSending] = useState(false);

  async function monitorTransaction(
    signaturePromise: Promise<string>,
    {onSuccess, onError}: { onSuccess: (signature: string) => void, onError: (signature: string) => void },
  ): Promise<void> {
    let id = enqueueSnackbar('Sending transaction...', {
      variant: 'info',
      persist: true,
    });
    setSending(true);
    try {
      let signature = await signaturePromise;
      closeSnackbar(id);
      id = enqueueSnackbar('Confirming transaction...', {
        variant: 'info',
        persist: true,
        action: <ViewTransactionOnExplorerButton signature={signature} />,
      });
      await confirmTransaction(connection, signature);
      closeSnackbar(id);
      setSending(false);
      enqueueSnackbar('Transaction confirmed', {
        variant: 'success',
        autoHideDuration: 15000,
        action: <ViewTransactionOnExplorerButton signature={signature} />,
      });
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (e) {
      closeSnackbar(id);
      setSending(false);
      console.warn(e);
      enqueueSnackbar(e.message, { variant: 'error' });
      if (onError) {
        onError(e);
      }
    }
  }

  return {monitorTransaction, sending};
}

function ViewTransactionOnExplorerButton({ signature }: {signature: string}) {
  const urlSuffix = useSolanaExplorerUrlSuffix();
  return (
    <Button
      color="inherit"
      component="a"
      target="_blank"
      rel="noopener"
      href={`https://explorer.solana.com/tx/${signature}` + urlSuffix}
    >
      View on Explorer
    </Button>
  );
}

export function useCallAsync() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  return async function callAsync(
    promise: Promise<string>,
    {
      progressMessage = 'Submitting...',
      successMessage = 'Success',
      onSuccess,
      onError,
    }: {
      progressMessage: string,
      successMessage: string,
      onSuccess: (message: string) => void,
      onError: (message: string) => void,
    }
  ) {
    let id = enqueueSnackbar(progressMessage, {
      variant: 'info',
      persist: true,
    });
    try {
      let result = await promise;
      closeSnackbar(id);
      if (successMessage) {
        enqueueSnackbar(successMessage, { variant: 'success' });
      }
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (e) {
      console.warn(e);
      closeSnackbar(id);
      enqueueSnackbar(e.message, { variant: 'error' });
      if (onError) {
        onError(e);
      }
    }
  };
  }