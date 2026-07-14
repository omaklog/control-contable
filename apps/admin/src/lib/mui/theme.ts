import { createTheme } from '@mui/material/styles'
import { esES } from '@mui/material/locale'

const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#37474F',
        light: '#546E7A',
        dark: '#263238',
      },
      secondary: {
        main: '#F57C00',
        light: '#FB8C00',
        dark: '#E65100',
      },
      background: {
        default: '#ECEFF1',
        paper: '#FFFFFF',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
    },
  },
  esES,
)

export default theme
