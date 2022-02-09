import { FC, ReactNode } from 'react';
import {
  createTheme,
  StyledEngineProvider,
  ThemeProvider,
} from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { grey, lightBlue } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    primary: lightBlue,
    grey: {
      900: grey[400] // LOL, to change the color in the already styled WalletMultiButton
    }
  },
  components: {
    MuiList: {
      styleOverrides: {
        root: {
          background: 'white',
        },
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: 'white'
        }
      }
    },
  },
  typography: {
    fontFamily: '"Red Hat Display", sans-serif',
  },
});

export const Theme: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={5} autoHideDuration={10000}>
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};
