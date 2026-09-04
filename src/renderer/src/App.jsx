import { CssBaseline } from '@mui/joy'
import { CssVarsProvider } from '@mui/joy/styles'
import Layout from './components/Layout'

function App() {
  return (
    <CssVarsProvider defaultMode="dark">
      <CssBaseline />
      <Layout />
    </CssVarsProvider>
  )
}

export default App
