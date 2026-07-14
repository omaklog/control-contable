import { createTheme } from '@mui/material/styles'
import { esES } from '@mui/material/locale'

const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#1565C0',
        light: '#1E88E5',
        dark: '#0D47A1',
      },
      secondary: {
        main: '#00897B',
        light: '#26A69A',
        dark: '#00695C',
      },
      background: {
        default: '#F5F5F5',
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
