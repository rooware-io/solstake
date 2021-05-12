import React, { useEffect, useState } from 'react';
//import logo from './logo.svg';
import './App.css';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom';
import { AppBar, Box, Button, Container, Menu, MenuItem, TextField, Toolbar, Typography, IconButton, Grid, Dialog, DialogTitle, DialogActions, DialogContent } from '@material-ui/core';
import DApp from './views/DApp';
import { ReactComponent as SolstakeLogoMainSvg } from './solstake-logo-main.svg';
import { ReactComponent as SolstakeTextOnlySvg } from './solstake-text-only.svg';
import { GitHub, Send, Twitter } from '@material-ui/icons';
import { validateEmail } from './utils/validation';

function App() {
  return (
    <Router>
      <Route exact path='/' component={Landing} />
      <Route path='/app' component={DApp} />
    </Router>
  );
}

const styles = {
  largeIcon: {
    fontSize: "2em"
  },
};

function SendButton(props: {callback: () => void, disabled: boolean}) {
  return (
    <Button
      onClick={props.callback}
      disabled={props.disabled}
    >
      <Send />
    </Button>
  );
}

async function submit(email: string) {
  const response = await fetch(
    'https://docs.google.com/forms/d/e/1FAIpQLSdi_hhrn3lPlbzUN0kUy0C05_HZFj9LwrHjmQK472bXRfG-MQ/formResponse',
    {
      method: 'POST',
      headers: { 'Content-Type': 'x-www-form-urlencoded' },
      body: new URLSearchParams({
        'entry.1456887657': email
      })
    }
  );
  console.log(response);
}

function Landing() {
  const [email, setEmail] = useState<string | null>(null);
  const [helperText, setHelperText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleClose() {
    setOpen(false);
  }

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
      <Grid
        container
        alignItems="center"
        justify="center"
        direction="column"
        style={{minHeight: '80vh', height: 'auto', textAlign: 'center'}}
      >
        <Grid item xs={10}>
          <SolstakeLogoMainSvg />
          <Typography>
            Solstake is an open-source and Non-custodial interface that makes staking SOL effortless
          </Typography>
          <Typography>
            Enjoy the beta, enter the your email to get notified when we are release our product
          </Typography>

          <Box m={3} />

          <TextField
            label="Enter your email"
            variant="outlined"
            style={{width: '80%'}}
            error={helperText !== null}
            helperText={helperText}
            onChange={(event) => {
              const isValid = validateEmail(event.target.value);
              if (isValid) {
                setHelperText(null);
                setEmail(event.target.value);
              }
              else {
                setHelperText('Invalid');
                setEmail(null);
              }
            }}
            InputProps={{
              endAdornment: <SendButton
                callback={() => { if(email) { submit(email) }; }}
                disabled={helperText !== null || !email}
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
    </>
  );
}

export default App;
