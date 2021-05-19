import React, { useState } from 'react';
import '../App.css';
import '../Stars.sass';
import {
  Link
} from 'react-router-dom';
import { AppBar, Box, Button, Menu, MenuItem, TextField, Toolbar, Typography, IconButton, Grid, Dialog, DialogTitle, DialogActions, DialogContent, makeStyles, Theme, createStyles, Snackbar } from '@material-ui/core';
import { ReactComponent as SolstakeLogoMainSvg } from '../solstake-logo-main.svg';
import { ReactComponent as SolstakeTextOnlySvg } from '../solstake-text-only.svg';
import { GitHub, Send, Twitter } from '@material-ui/icons';
import { validateEmail } from '../utils/validation';
import { Alert } from '@material-ui/lab';
import { Color } from '@material-ui/lab/Alert';

async function submit(email: string) {
  try {
    const response = await fetch(
      'https://hooks.zapier.com/hooks/catch/1602339/bob62i2/',
      {
        method: 'POST',
        // https://zapier.com/help/create/code-webhooks/troubleshoot-webhooks-in-zapier#posting-json-from-web-browser-access-control-allow-headers-in-preflight-response-error
        body: JSON.stringify({
          'email': email
        })
      }
    );
  
    console.log(response);
    return response.ok;
  }
  catch(TypeError) { // TypeError: NetworkError when attempting to fetch resource.
    return false;
  }
}

const styles = {
  largeIcon: {
    fontSize: "2em"
  },
};

function SendButton(props: {callback: () => Promise<void>, disabled: boolean}) {
  return (
    <Button
      onClick={props.callback}
      disabled={props.disabled}
    >
      <Send />
    </Button>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
  }),
);

interface Message {
  open: boolean;
  content: string;
  severity: Color;
};

export function Landing() {
    const [email, setEmail] = useState('');
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [message, setMessage] = useState<Message>({open: false, content: '', severity: 'success'});
    const [open, setOpen] = useState(false);
  
    function handleClose() {
      setOpen(false);
    }

    function handleCloseSnackbar() {
      setMessage({open: false, content: '', severity: 'success'});
    }

    async function submitAndFeedback() {
      if (email) {
        const success = await submit(email);
        if (success) {
          setEmail('');
          setMessage({open: true, content: 'Your email has been sent, we will get back to you when solstake is released', severity: 'success'});
        }
        else {
          setMessage({open: true, content: 'Failed to send email, please try again later', severity: 'error'});
        }
      }
    }

    const classes = useStyles();
  
    return (
      <>
        <AppBar style={{backgroundColor: '#fdc100'}} className="AppBar" position="relative">
          <Toolbar>
            <SolstakeTextOnlySvg className="App-logo" width="20%" />
            <div style={{flexGrow: 1}}></div>
            <div style={{display: 'flex', gap: '10px'}}>
            <Link style={{textDecoration: 'none'}} to="/app">
              <Button variant="contained">Use Solstake</Button>
            </Link>
          </div>
          </Toolbar>
        </AppBar>
        <Menu
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={false}
        >
          <MenuItem>Demo</MenuItem>
        </Menu>
        <div className={classes.root}>
          <Grid
            container
            alignItems="center"
            justify="center"
            direction="column"
            style={{minHeight: '100vh', textAlign: 'center'}}
          >
            <Grid item xs={8}>
              <SolstakeLogoMainSvg />
              <Typography style={{visibility: 'hidden'}}>
                Hack for non working svg scaling SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
              </Typography>
              <Typography>
                Solstake is an open-source and Non-custodial interface that makes staking SOL effortless
              </Typography>
              <Typography>
                Enjoy the beta, enter your email to get notified when we release our product
              </Typography>
    
              <Box m={3} />
    
              <TextField
                label="Enter your email"
                variant="outlined"
                style={{width: '40%'}}
                error={email !== '' && !isEmailValid}
                helperText={(email !== '' && !isEmailValid) ? 'Invalid' : null}
                onKeyDown={async (event) => {
                  if (event.key === 'Enter') {
                    await submitAndFeedback();
                  }
                }}
                onChange={(event) => {
                  const email = event.target.value;
                  setEmail(email);

                  const isValid = validateEmail(email);
                  setIsEmailValid(isValid);
                }}
                value={email}
                InputProps={{
                  endAdornment: <SendButton
                    callback={submitAndFeedback}
                    disabled={!isEmailValid}
                  />
                }}
              />
    
              <Box m={3} />
    
              <div>
                <IconButton
                  href="https://github.com/rooware-io/solstake"
                >
                  <GitHub style={styles.largeIcon} />
                </IconButton>
                <IconButton
                  href="https://twitter.com/solstakeio"
                >
                  <Twitter style={styles.largeIcon} />
                </IconButton>
              </div>
            </Grid>
          </Grid>
        </div>
        <Dialog
            title="Email sent!"
            fullWidth={true}
            open={open}
            onClose={handleClose}
        >
          <DialogTitle>Email sent!</DialogTitle>
          <DialogContent>
            <Box m={1}>
              <Typography>
                Thank you for registering, we will get back to you when solstake is production ready
              </Typography>
            </Box>
          </DialogContent>
  
          <DialogActions>
            <Button onClick={handleClose} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>
        <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div>
        <Snackbar open={message.open} autoHideDuration={10000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleClose} severity={message.severity}>
            {message.content}
          </Alert>
        </Snackbar>
      </>
    );
  }