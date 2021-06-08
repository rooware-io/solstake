import React, { useState } from 'react';
import '../App.css';
//import '../Stars.sass';
import {
  Link
} from 'react-router-dom';
import { Box, Button, TextField, Typography, IconButton, Grid, Dialog, DialogTitle, DialogActions, DialogContent, makeStyles, Theme, createStyles, Snackbar } from '@material-ui/core';
import { ReactComponent as SolstakeLogoMainSvg } from '../assets/logo-white.svg';
import { GitHub, Send, Twitter, YouTube } from '@material-ui/icons';
import { validateEmail } from '../utils/email';
import { Alert } from '@material-ui/lab';
import { Color } from '@material-ui/lab/Alert';
import { submitEmail } from '../utils/email';

const styles = {
  largeIcon: {
    fontSize: "2.5em"
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
      flexGrow: 1
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
    const [openVideo, setOpenVideo] = useState(false);
  
    function handleClose() {
      setOpen(false);
    }

    function handleCloseVideo() {
      setOpenVideo(false);
    }

    function handleCloseSnackbar() {
      setMessage({open: false, content: '', severity: 'success'});
    }

    async function submitAndFeedback() {
      if (email) {
        const success = await submitEmail(email);
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
      <div id="landing">
        <div className={classes.root}>
          <Grid
            container
            alignItems="center"
            justify="center"
            direction="column"
            style={{minHeight: '100vh', textAlign: 'center', overflow: 'hidden'}}
          >
            <Grid item xs={8}>
              <SolstakeLogoMainSvg />
              <Typography style={{visibility: 'hidden'}}>
                Hack for non working svg scaling SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
              </Typography>
              <Typography color="primary" variant="h4">
                Solstake is an open-source and Non-custodial interface that makes staking SOL effortless
              </Typography>

              <Box m={4} />

              <Link style={{textDecoration: 'none'}} to="/app">
                <Button variant="contained" size="large">
                  <Typography variant="h5">
                    Use Solstake
                  </Typography>
                </Button>
              </Link>
    
              <Box m={4} />

              <Typography color="primary" variant="h5">
                Enjoy the beta, enter your email to get notified when we release our product
              </Typography>
    
              <Box m={4} />

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
                  onClick={() => setOpenVideo(true)}
                >
                  <YouTube style={styles.largeIcon} />
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
        <Dialog
          open={openVideo}
          fullWidth
          maxWidth="md"
          onClose={handleCloseVideo}
        >
          <div className="videoWrapper">
            <iframe width="560" height="315" src="https://www.youtube.com/embed/JUDG6j5ktW4" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
          </div>
        </Dialog>
        {/* <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div> */}
        <Snackbar open={message.open} autoHideDuration={10000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleClose} severity={message.severity}>
            {message.content}
          </Alert>
        </Snackbar>
      </div>
    );
  }