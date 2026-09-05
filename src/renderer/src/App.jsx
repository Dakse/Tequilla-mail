import { CssBaseline } from '@mui/joy'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import Layout from './components/Layout'

const primary = {
  50: '#e6f7f7',
  100: '#b3e5e5',
  200: '#80d4d4',
  300: '#4dc2c2',
  400: '#26b3b3',
  500: '#009999',
  600: '#008a8a',
  700: '#007a7a',
  800: '#006b6b',
  900: '#004d4d'
}

const theme = extendTheme({
  colorSchemes: {
    light: { palette: { primary } },
    dark: { palette: { primary } }
  }
})

function App() {
  return (
    <CssVarsProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <Layout />
    </CssVarsProvider>
  )
}

export default App
