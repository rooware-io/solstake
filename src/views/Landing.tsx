import { FC, useState } from 'react';
import '../App.css';
import {
  Link
} from 'react-router-dom';
import { Box, Typography, IconButton, Grid, Dialog, SvgIcon } from '@mui/material';
import SolstakeLogoMainSvg from '../assets/logo-white.svg';
import { GitHub, Twitter, YouTube } from '@mui/icons-material';
import Discord from '../assets/discord-brands.svg';

const Landing: FC = () => {
  const [openVideo, setOpenVideo] = useState(false);

  function handleCloseVideo() {
    setOpenVideo(false);
  }
  
  return (
    <div className="flex h-screen justify-center items-center">
      <Grid
        container
        alignItems="center"
        direction="column"
        style={{textAlign: 'center'}}
      >
        <Grid item xs={10}>
          <div className="flex justify-center text-center p-0">
            <div className="w-10/12 sm:1/4 md:w-3/4 lg:w-2/3 xl:w-1/3 pt-5 md:pt-0">
              <SolstakeLogoMainSvg />
            </div>
          </div>
          <Typography style={{visibility: 'hidden'}}>
              Hack for non working svg scaling SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
          </Typography>

          <div className="font-display uppercase text-4half sm:text-5xl md:text-6xl text-solblue-dark dark:text-solblue font-bold leading-tight">
            <p className="inline px-2 md:block md:px-0">Stake your SOL</p>
            <p className="inline px-2 md:block md:px-0">manage accounts</p>
            <p className="inline px-2 md:block md:px-0">earn rewards</p>
          </div>

          <div className="uppercase text-solblue-dark dark:text-gray-300 text-2xl sm:text-3xl pt-3 md:font-light dark:font-normal">
            Staking Solana made easy
          </div>

          <Box m={4} />

            <div className="flex justify-center text-center pb-24">
              <Link to="/app">
                <div className="solBtnAcid font-bold">
                  <span className="text-md sm:text-xl p-2">Use Solstake</span>
                </div>
              </Link>
            </div>


          <div className="flex justify-center text-center pb-5">
            <div className="w-4/6 text-lg text-solblue-darker dark:text-gray-300">We’re just getting started around here. In the meantime stay updated on product releases, new features and more.</div>
          </div>

          <div>
            <IconButton
              href="https://github.com/rooware-io/solstake"
              rel="noopener noreferrer" target="_blank"
            >
              <GitHub fontSize="large" />
            </IconButton>
            <IconButton
              size="medium"
              onClick={() => setOpenVideo(true)}
            >
              <YouTube fontSize="large" />
            </IconButton>
            <IconButton
              href="https://discord.gg/r5fZHdfu"
              rel="noopener noreferrer" target="_blank"
            >
              <SvgIcon fontSize="large">
                <Discord />
              </SvgIcon>
            </IconButton>
            <IconButton
              href="https://twitter.com/solstakeio"
              rel="noopener noreferrer" target="_blank"
            >
              <Twitter fontSize="large" />
            </IconButton>
          </div>
        </Grid>
      </Grid>
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
    </div>
  );
}

export default Landing;