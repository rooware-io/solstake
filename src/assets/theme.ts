import { createMuiTheme } from "@material-ui/core";
import { purple, green } from "@material-ui/core/colors";

export const theme = createMuiTheme({
  palette: {
    text: {
      primary: '#7DFFFF',
      secondary: '#7DFFFF'
    },
    primary: {
      main: '#7DFFFF',
    },
    secondary: {
      main: green[500],
    },
  },
  typography: {
    fontFamily: '"Red Hat Display", sans-serif'
  }
});